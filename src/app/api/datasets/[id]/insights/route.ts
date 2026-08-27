import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { withDuckDB, getDatasetParquetPath } from "@/lib/engine/duckdb";
import { profileParquetFile } from "@/lib/engine/profile";
import { computeDatasetKpis } from "@/lib/engine/kpi-engine";
import { generateDatasetInsights } from "@/lib/engine/insights";

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

    const report = await withDuckDB(async (conn) => {
      const profile = await profileParquetFile(conn, parquetPath);
      const kpis = await computeDatasetKpis(conn, parquetPath, profile.columns);
      return await generateDatasetInsights(conn, parquetPath, profile, kpis);
    });

    return NextResponse.json(report);
  } catch (err: any) {
    console.error("Insights generation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate business insights" },
      { status: 500 },
    );
  }
}
