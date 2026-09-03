import pg from "pg";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { withDuckDB, getSourceParquetPath, getOrgStorageDir } from "./duckdb";
import { profileParquetFile, type DatasetProfile } from "./profile";
import { sanitizeColumnName } from "./ingest-file";

const { Client } = pg;

export interface PgConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl?: boolean | "require" | "disable";
}

export interface RemoteTableInfo {
  tableSchema: string;
  tableName: string;
  estimatedRows: number;
  columnCount: number;
  columns: Array<{ name: string; type: string; isNullable: boolean }>;
}

function resolvePgSsl(config: PgConnectionConfig) {
  if (config.ssl === false || config.ssl === "disable") return false;
  if (config.ssl === true || config.ssl === "require") return { rejectUnauthorized: false };
  const isLocal =
    config.host === "localhost" ||
    config.host === "127.0.0.1" ||
    config.host === "::1" ||
    config.host.startsWith("192.168.") ||
    config.host.startsWith("10.");
  return isLocal ? false : { rejectUnauthorized: false };
}

/**
 * Test an external PostgreSQL database connection with strict timeout.
 */
export async function testPostgresConnection(
  config: PgConnectionConfig,
): Promise<{ ok: boolean; version?: string; latencyMs?: number; error?: string }> {
  const start = Date.now();
  const client = new Client({
    host: config.host,
    port: config.port || 5432,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: resolvePgSsl(config),
    connectionTimeoutMillis: 5000,
    statement_timeout: 5000,
  });

  try {
    await client.connect();
    const res = await client.query("SHOW server_version");
    const latencyMs = Date.now() - start;
    return { ok: true, version: res.rows[0]?.server_version, latencyMs };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to connect to database" };
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * Fetch available schemas and tables from the external PostgreSQL database.
 */
export async function listPostgresTables(
  config: PgConnectionConfig,
): Promise<RemoteTableInfo[]> {
  const client = new Client({
    host: config.host,
    port: config.port || 5432,
    database: config.database,
    user: config.user,
    password: config.password != null ? String(config.password) : "",
    ssl: resolvePgSsl(config),
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });

  try {
    await client.connect();

    // Query information_schema for user tables
    const tableQuery = `
      SELECT 
        table_schema, 
        table_name
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name;
    `;
    const tablesRes = await client.query(tableQuery);

    const tables: RemoteTableInfo[] = [];

    for (const row of tablesRes.rows) {
      const schema = row.table_schema;
      const table = row.table_name;

      // Get columns
      const colsRes = await client.query(
        `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position;
      `,
        [schema, table],
      );

      // Fast estimated row count from pg_class
      const rowEstRes = await client.query(
        `
        SELECT reltuples::bigint AS est_rows
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1 AND c.relname = $2;
      `,
        [schema, table],
      );

      tables.push({
        tableSchema: schema,
        tableName: table,
        estimatedRows: Math.max(0, Number(rowEstRes.rows[0]?.est_rows ?? 0)),
        columnCount: colsRes.rows.length,
        columns: colsRes.rows.map((c) => ({
          name: c.column_name,
          type: c.data_type,
          isNullable: c.is_nullable === "YES",
        })),
      });
    }

    return tables;
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * Ingest a specific table from PostgreSQL and write to Parquet in DuckDB.
 */
export async function ingestPostgresTable(params: {
  orgId: string;
  sourceId: string;
  config: PgConnectionConfig;
  tableSchema: string;
  tableName: string;
  limit?: number;
}): Promise<{
  sourceId: string;
  tableName: string;
  primaryParquetPath: string;
  profile: DatasetProfile;
}> {
  const { orgId, sourceId, config, tableSchema, tableName, limit } = params;

  const client = new Client({
    host: config.host,
    port: config.port || 5432,
    database: config.database,
    user: config.user,
    password: config.password != null ? String(config.password) : "",
    ssl: resolvePgSsl(config),
    connectionTimeoutMillis: 10000,
    statement_timeout: 60000,
  });

  const tempCsvPath = join(
    getOrgStorageDir(orgId),
    "sources",
    `temp_pg_${sourceId}.csv`,
  ).replace(/\\/g, "/");

  const parquetPath = getSourceParquetPath(orgId, sourceId);
  const normParquetPath = parquetPath.replace(/\\/g, "/");

  try {
    await client.connect();

    const query = `
      SELECT * 
      FROM "${tableSchema.replace(/"/g, '""')}"."${tableName.replace(/"/g, '""')}"
      ${limit ? `LIMIT ${Math.min(limit, 500000)}` : ""}
    `;

    const res = await client.query(query);
    if (!res.fields || res.fields.length === 0) {
      throw new Error(`Table ${tableSchema}.${tableName} has no columns or data`);
    }

    const seen = new Set<string>();
    const headers = res.fields.map((f, idx) =>
      sanitizeColumnName(f.name, idx, seen),
    );

    const csvLines: string[] = [];
    csvLines.push(headers.map((h) => `"${h}"`).join(","));

    for (const row of res.rows) {
      const values: string[] = [];
      for (const field of res.fields) {
        const val = row[field.name];
        if (val === null || val === undefined) {
          values.push("");
        } else if (val instanceof Date) {
          values.push(`"${val.toISOString()}"`);
        } else {
          const s = String(val).replace(/"/g, '""');
          values.push(`"${s}"`);
        }
      }
      csvLines.push(values.join(","));
    }

    writeFileSync(tempCsvPath, csvLines.join("\n"), "utf8");

    const profile = await withDuckDB(async (conn) => {
      await conn.run(
        `CREATE TABLE temp_pg_ingest AS SELECT * FROM read_csv('${tempCsvPath}', header=true, auto_detect=true, null_padding=true, ignore_errors=true)`,
      );
      await conn.run(
        `COPY temp_pg_ingest TO '${normParquetPath}' (FORMAT PARQUET, COMPRESSION ZSTD)`,
      );
      await conn.run(`DROP TABLE temp_pg_ingest`);
      return await profileParquetFile(conn, parquetPath);
    });

    return {
      sourceId,
      tableName: `${tableSchema}.${tableName}`,
      primaryParquetPath: parquetPath,
      profile,
    };
  } finally {
    await client.end().catch(() => {});
    try {
      unlinkSync(tempCsvPath);
    } catch {
      // ignore
    }
  }
}
