import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";
import { existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * Embedded DuckDB analytical engine (PRD §4 / FR-3.1).
 * Manages an in-process DuckDB instance for fast analytical queries over Parquet
 * files staged on the local storage volume.
 */

let instancePromise: Promise<DuckDBInstance> | null = null;

export function getStorageRoot(): string {
  const root = process.env.STORAGE_DIR ?? "./storage";
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
