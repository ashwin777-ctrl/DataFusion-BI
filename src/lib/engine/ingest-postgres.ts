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

export function parsePgConnectionString(raw?: string): Partial<PgConnectionConfig> | null {
  if (!raw?.trim()) return null;
  try {
    let trimmed = raw.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      trimmed = trimmed.slice(1, -1).trim();
    }
    if (!trimmed.startsWith("postgres://") && !trimmed.startsWith("postgresql://")) {
      trimmed = "postgres://" + trimmed;
    }
    const u = new URL(trimmed);
    if (!u.hostname) return null;

    const sslMode = u.searchParams.get("sslmode");
    const isLocal =
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname === "::1" ||
      u.hostname.startsWith("192.168.") ||
      u.hostname.startsWith("10.");

    let ssl: boolean | undefined = undefined;
    if (sslMode === "disable") {
      ssl = false;
    } else if (sslMode === "require" || sslMode === "verify-full" || sslMode === "verify-ca") {
      ssl = true;
    } else if (isLocal) {
      ssl = false;
    } else if (!isLocal && sslMode !== null) {
      ssl = true;
    }

    return {
      host: u.hostname,
      port: u.port ? Number(u.port) : 5432,
      database: decodeURIComponent(u.pathname.replace(/^\//, "") || "postgres"),
      user: decodeURIComponent(u.username || "postgres"),
      password: decodeURIComponent(u.password || ""),
      ssl,
    };
  } catch {
    return null;
  }
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

function checkCloudLocalhost(host: string): string | null {
  const isCloud = Boolean(process.env.VERCEL || (process.env.NODE_ENV === "production" && !process.env.ALLOW_LOCAL_POSTGRES));
  if (isCloud && (host === "127.0.0.1" || host === "localhost" || host === "::1")) {
    return "Cannot connect to 'localhost' or '127.0.0.1' from cloud deployments. Please provide a publicly accessible database host (e.g. Supabase, Neon, AWS RDS).";
  }
  return null;
}

export function normalizePgConfig(config: PgConnectionConfig): PgConnectionConfig {
  let normalized = { ...config };
  if (normalized.host?.startsWith("postgres://") || normalized.host?.startsWith("postgresql://")) {
    const parsed = parsePgConnectionString(normalized.host);
    if (parsed) {
      normalized = { ...normalized, ...parsed } as PgConnectionConfig;
    }
  }

  // Handle host:port passed as host string (e.g. "127.0.0.1:5434")
  if (normalized.host && normalized.host.includes(":") && !normalized.host.includes("[")) {
    const parts = normalized.host.split(":");
    normalized.host = parts[0] || "127.0.0.1";
    if (parts[1] && !isNaN(Number(parts[1]))) {
      normalized.port = Number(parts[1]);
    }
  }

  return normalized;
}

/**
 * Test an external PostgreSQL database connection with strict timeout.
 */
export async function testPostgresConnection(
  rawConfig: PgConnectionConfig,
): Promise<{ ok: boolean; version?: string; latencyMs?: number; error?: string }> {
  const config = normalizePgConfig(rawConfig);

  const localErr = checkCloudLocalhost(config.host);
  if (localErr) {
    return { ok: false, error: localErr };
  }

  const start = Date.now();
  const client = new Client({
    host: config.host,
    port: config.port || 5432,
    database: config.database,
    user: config.user,
    password: config.password != null ? String(config.password) : "",
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
  rawConfig: PgConnectionConfig,
): Promise<RemoteTableInfo[]> {
  const config = normalizePgConfig(rawConfig);

  const localErr = checkCloudLocalhost(config.host);
  if (localErr) {
    throw new Error(localErr);
  }

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
  const { orgId, sourceId, tableSchema, tableName, limit } = params;
  const config = normalizePgConfig(params.config);

  const localErr = checkCloudLocalhost(config.host);
  if (localErr) {
    throw new Error(localErr);
  }

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
