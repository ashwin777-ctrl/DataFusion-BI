import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { ingestPostgresTable } from "@/lib/engine/ingest-postgres";
import { randomUUID } from "node:crypto";
import { statSync } from "node:fs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();

    const body = await req.json();
    const { host, port, database, user, password, ssl, tableSchema, tableName, limit } = body;

    if (!host || !database || !user || !tableSchema || !tableName) {
      return NextResponse.json(
        { error: "Database configuration and table name are required" },
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
