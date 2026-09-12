import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { ingestPostgresTable, parsePgConnectionString } from "@/lib/engine/ingest-postgres";
import { persistStorageBlob } from "@/lib/engine/duckdb";
import { randomUUID } from "node:crypto";
import { statSync, readFileSync } from "node:fs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();

    const body = await req.json();
    const { tableSchema, tableName, limit } = body;
    const connectionString = body.connectionString || body.uri || body.url;
    let host = body.host || body.hostname || body.dbHost || body.databaseHost;
    let port = body.port || body.dbPort;
    let database = body.database || body.dbName || body.databaseName;
    let user = body.user || body.username || body.dbUser;
    let password = body.password !== undefined ? body.password : (body.pass !== undefined ? body.pass : "");
    let ssl = body.ssl;

    if (connectionString || host?.startsWith("postgres://") || host?.startsWith("postgresql://")) {
      const parsed = parsePgConnectionString(connectionString || host);
      if (parsed) {
        host = parsed.host || host;
        port = parsed.port || port;
        database = parsed.database || database;
        user = parsed.user || user;
        if (!password) password = parsed.password || "";
        if (ssl === undefined) ssl = parsed.ssl;
      }
    }

    // Split host:port if provided in host
    if (host && typeof host === "string" && host.includes(":") && !host.includes("[")) {
      const parts = host.split(":");
      host = parts[0];
      if (parts[1] && !isNaN(Number(parts[1]))) {
        port = Number(parts[1]);
      }
    }

    if (!host || !database || !user || !tableSchema || !tableName) {
      return NextResponse.json(
        { error: "Database configuration (host, database, user) and table name are required" },
        { status: 400 },
      );
    }

    const sourceId = randomUUID();
    const ingestRes = await ingestPostgresTable({
      orgId,
      sourceId,
      config: {
        host,
        port: Number(port || 5432),
        database,
        user,
        password,
        ssl,
      },
      tableSchema,
      tableName,
      limit,
    });

    const parquetBytes = statSync(ingestRes.primaryParquetPath).size;
    try {
      const pBuf = readFileSync(ingestRes.primaryParquetPath);
      await persistStorageBlob(ingestRes.primaryParquetPath, pBuf);
    } catch (e) {
      console.error("Failed to persist synced postgres parquet blob:", e);
    }
    const alias = `${tableSchema}_${tableName}`.toLowerCase().replace(/[^a-z0-9_]/g, "_");

    await withOrg(orgId, async (db) => {
      await db.insert(schema.sources).values({
        id: sourceId,
        orgId,
        kind: "pg_table",
        alias,
        schemaName: tableSchema,
        tableName,
        rowCount: ingestRes.profile.rowCount,
        parquetPath: ingestRes.primaryParquetPath,
        parquetBytes,
        profiledAt: new Date(),
      });

      let ord = 0;
      for (const col of ingestRes.profile.columns) {
        await db.insert(schema.columnProfiles).values({
          id: randomUUID(),
          orgId,
          sourceId,
          ordinal: ord++,
          rawName: col.name,
          normalizedName: col.name.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
          storageType: col.originalType,
          semanticRole: col.role,
          semanticSubtype: col.inferredType,
          confidence: 0.9,
          nullCount: col.nullCount,
          distinctCount: col.distinctCount,
          cardinalityRatio: col.rowCount > 0 ? col.distinctCount / col.rowCount : 0,
          minValue: col.min != null ? String(col.min) : null,
          maxValue: col.max != null ? String(col.max) : null,
          stats: {
            mean: col.mean,
            sum: col.sum,
            stdDev: col.stdDev,
            topValues: col.topValues,
          },
          sampleValues: col.sampleValues,
        });
      }
    });

    return NextResponse.json({
      success: true,
      sourceId,
      tableName: ingestRes.tableName,
      profile: ingestRes.profile,
    });
  } catch (err: any) {
    console.error("Postgres table sync error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to sync PostgreSQL table" },
      { status: 500 },
    );
  }
}
