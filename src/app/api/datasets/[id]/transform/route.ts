import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { withDuckDB, getDatasetParquetPath } from "@/lib/engine/duckdb";
import { buildTransformSql, type TransformStep } from "@/lib/engine/transform";
import { profileParquetFile } from "@/lib/engine/profile";
import { statSync } from "node:fs";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id: datasetId } = await params;

    const body = await req.json();
    const { steps } = body as { steps: TransformStep[] };

    if (!steps || !Array.isArray(steps)) {
      return NextResponse.json({ error: "Transform steps array is required" }, { status: 400 });
    }

    const dataset = await withOrg(orgId, async (db) => {
      const res = await db
        .select()
        .from(schema.datasets)
        .where(and(eq(schema.datasets.id, datasetId), eq(schema.datasets.orgId, orgId)))
        .limit(1);
      return res[0] || null;
    });

    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    const parquetPath = dataset.duckdbPath || getDatasetParquetPath(orgId, datasetId);
    const norm = parquetPath.replace(/\\/g, "/");

    const profile = await withDuckDB(async (conn) => {
      const transformSql = buildTransformSql(parquetPath, steps);
      await conn.run(
        `CREATE OR REPLACE TABLE transformed_temp AS ${transformSql}`,
      );
      await conn.run(
        `COPY transformed_temp TO '${norm}' (FORMAT PARQUET, COMPRESSION ZSTD)`,
      );
      await conn.run(`DROP TABLE transformed_temp`);
      return await profileParquetFile(conn, parquetPath);
    });

    const newBytes = statSync(parquetPath).size;

    await withOrg(orgId, async (db) => {
      await db
        .update(schema.datasets)
        .set({
          rowCount: profile.rowCount,
          storageBytes: newBytes,
          dataVersion: (dataset.dataVersion || 0) + 1,
          lastRefreshedAt: new Date(),
        })
        .where(eq(schema.datasets.id, datasetId));
    });

    return NextResponse.json({
      success: true,
      rowCount: profile.rowCount,
      profile,
    });
  } catch (err: any) {
    console.error("Transformation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to apply transformations" },
      { status: 500 },
    );
  }
}
