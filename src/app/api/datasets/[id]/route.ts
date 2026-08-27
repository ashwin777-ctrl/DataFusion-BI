import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { withDuckDB, queryDuckDB, getDatasetParquetPath } from "@/lib/engine/duckdb";
import { profileParquetFile } from "@/lib/engine/profile";
import { existsSync, unlinkSync } from "node:fs";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id: datasetId } = await params;

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
    if (!existsSync(parquetPath)) {
      return NextResponse.json(
        { error: "Dataset storage file not found" },
        { status: 404 },
      );
    }

    const { profile, preview } = await withDuckDB(async (conn) => {
      const prof = await profileParquetFile(conn, parquetPath);
      const norm = parquetPath.replace(/\\/g, "/");
      const prev = await queryDuckDB(conn, `SELECT * FROM read_parquet('${norm}') LIMIT 100`);
      return { profile: prof, preview: prev };
    });

    return NextResponse.json({
      dataset,
      profile,
      preview,
    });
  } catch (err: any) {
    console.error("Dataset detail error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch dataset details" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id: datasetId } = await params;

    await withOrg(orgId, async (db) => {
      const ds = await db
        .select()
        .from(schema.datasets)
        .where(and(eq(schema.datasets.id, datasetId), eq(schema.datasets.orgId, orgId)))
        .limit(1);

      if (ds && ds.length > 0 && ds[0]) {
        const pPath = ds[0].duckdbPath;
        if (pPath && existsSync(pPath)) {
          try {
            unlinkSync(pPath);
          } catch {
            // ignore
          }
        }
        await db.delete(schema.datasets).where(eq(schema.datasets.id, datasetId));
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete dataset" },
      { status: 500 },
    );
  }
}
