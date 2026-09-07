import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";
import { existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { resolve, join, dirname, basename } from "node:path";
import { pool } from "@/lib/db";

/**
 * Embedded DuckDB analytical engine (PRD §4 / FR-3.1).
 * Manages an in-process DuckDB instance for fast analytical queries over Parquet
 * files staged on the local storage volume.
 */

let instancePromise: Promise<DuckDBInstance> | null = null;

/**
 * Persist a file buffer to PostgreSQL storage_blobs so it survives serverless cold starts.
 */
export async function persistStorageBlob(filePath: string, buffer: Buffer): Promise<void> {
  const norm = filePath.replace(/\\/g, "/");
  try {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO storage_blobs (path, content, byte_size, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (path) DO UPDATE SET content = EXCLUDED.content, byte_size = EXCLUDED.byte_size, updated_at = NOW()`,
        [norm, buffer, buffer.byteLength],
      );
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Failed to persist storage blob to PostgreSQL:", err);
  }
}

/**
 * Ensure a file exists on the local filesystem. If missing (e.g. fresh serverless container),
 * restores it from PostgreSQL storage_blobs.
 */
export async function ensureStorageBlob(filePath: string): Promise<boolean> {
  if (!filePath) return false;
  const norm = filePath.replace(/\\/g, "/");

  if (existsSync(norm)) {
    try {
      if (statSync(norm).size > 0) return true;
    } catch {
      // stat failed, fall through to fetch from db
    }
  }

  try {
    const client = await pool.connect();
    try {
      const fileName = basename(norm);
      const res = await client.query(
        `SELECT content FROM storage_blobs WHERE path = $1 OR path LIKE $2 LIMIT 1`,
        [norm, `%${fileName}`],
      );

      if (res.rows.length > 0 && res.rows[0]?.content) {
        const dir = dirname(norm);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        writeFileSync(norm, res.rows[0].content);
        return true;
      }

      // If not found in storage_blobs and path is a dataset parquet, try to find the source parquet
      if (norm.includes("/datasets/")) {
        const datasetIdMatch = norm.match(/\/datasets\/([a-f0-9-]+)\.parquet/i);
        if (datasetIdMatch && datasetIdMatch[1]) {
          const dsId = datasetIdMatch[1];
          const dsRow = await client.query(
            `SELECT fact_source_id, org_id FROM datasets WHERE id = $1 LIMIT 1`,
            [dsId],
          );
          if (dsRow.rows.length > 0 && dsRow.rows[0]?.fact_source_id) {
            const factSourceId = dsRow.rows[0].fact_source_id;
            const srcRow = await client.query(
              `SELECT parquet_path FROM sources WHERE id = $1 LIMIT 1`,
              [factSourceId],
            );
            if (srcRow.rows.length > 0 && srcRow.rows[0]?.parquet_path) {
              const srcParquet = srcRow.rows[0].parquet_path;
              const srcRes = await client.query(
                `SELECT content FROM storage_blobs WHERE path = $1 OR path LIKE $2 LIMIT 1`,
                [srcParquet, `%${basename(srcParquet)}`],
              );
              if (srcRes.rows.length > 0 && srcRes.rows[0]?.content) {
                const dir = dirname(norm);
                if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
                writeFileSync(norm, srcRes.rows[0].content);
                await client.query(
                  `INSERT INTO storage_blobs (path, content, byte_size, updated_at)
                   VALUES ($1, $2, $3, NOW())
                   ON CONFLICT (path) DO NOTHING`,
                  [norm, srcRes.rows[0].content, srcRes.rows[0].content.length],
                );
                return true;
              }
            }
          }
        }
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Failed to restore storage blob from PostgreSQL:", err);
  }

  return existsSync(norm);
}

export function getStorageRoot(): string {
  let root = process.env.STORAGE_DIR;
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    (typeof process.cwd === "function" && process.cwd().startsWith("/var/task"))
  );

  if (!root || (isServerless && (root === "./storage" || root.startsWith("./") || root.startsWith("/var/task")))) {
    root = isServerless ? "/tmp/storage" : "./storage";
  }

  const abs = resolve(root);
  if (!existsSync(abs)) {
    mkdirSync(abs, { recursive: true });
  }
  return abs;
}

export function getOrgStorageDir(orgId: string): string {
  const orgDir = join(getStorageRoot(), orgId);
  const sourcesDir = join(orgDir, "sources");
  const datasetsDir = join(orgDir, "datasets");
  const exportsDir = join(orgDir, "exports");

  for (const dir of [orgDir, sourcesDir, datasetsDir, exportsDir]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
  return orgDir;
}

export function getSourceParquetPath(orgId: string, sourceId: string): string {
  return join(getOrgStorageDir(orgId), "sources", `${sourceId}.parquet`);
}

export function getDatasetParquetPath(orgId: string, datasetId: string): string {
  return join(getOrgStorageDir(orgId), "datasets", `${datasetId}.parquet`);
}

export async function getDuckDBInstance(): Promise<DuckDBInstance> {
  if (!instancePromise) {
    instancePromise = DuckDBInstance.create();
  }
  return instancePromise;
}

export async function withDuckDB<T>(
  fn: (conn: DuckDBConnection) => Promise<T>,
): Promise<T> {
  const instance = await getDuckDBInstance();
  const conn = await instance.connect();
  try {
    return await fn(conn);
  } finally {
    // node-api connection cleanup
    try {
      if (typeof (conn as any).close === "function") {
        await (conn as any).close();
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Execute a SQL query on DuckDB and return clean JSON-serializable row objects.
 * Handles Decimal, BigInt, Date, and other DuckDB specific vector types.
 */
export async function queryDuckDB<T = Record<string, any>>(
  conn: DuckDBConnection,
  sql: string,
): Promise<T[]> {
  const result = await conn.run(sql);
  const columnNames = result.columnNames();
  const rows: T[] = [];
  const chunkCount = result.chunkCount;

  for (let i = 0; i < chunkCount; i++) {
    const chunk = result.getChunk(i);
    const chunkRows = chunk.getRowObjects(columnNames);
    for (const rawRow of chunkRows) {
      const sanitized: Record<string, any> = {};
      for (const [k, v] of Object.entries(rawRow as Record<string, any>)) {
        sanitized[k] = sanitizeDuckDBValue(v);
      }
      rows.push(sanitized as T);
    }
  }

  return rows;
}

export function sanitizeDuckDBValue(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === "bigint") return Number(val);
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "object") {
    // DuckDBDecimalValue: { width, scale, value: BigInt }
    if ("scale" in val && "value" in val && typeof val.value === "bigint") {
      const divisor = Math.pow(10, Number(val.scale));
      return Number(val.value) / divisor;
    }
    if (typeof val.toISOString === "function") {
      return val.toISOString();
    }
    if (typeof val.valueOf === "function") {
      const v = val.valueOf();
      if (typeof v !== "object") return v;
    }
  }
  return val;
}
