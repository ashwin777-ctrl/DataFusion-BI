import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { withDuckDB, getDatasetParquetPath } from "@/lib/engine/duckdb";
import { profileParquetFile } from "@/lib/engine/profile";
import { computeDatasetKpis } from "@/lib/engine/kpi-engine";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id: datasetId } = await params;
    const filterSql = req.nextUrl.searchParams.get("filterSql") || undefined;
    const dateColumn = req.nextUrl.searchParams.get("dateColumn") || undefined;

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

    const kpis = await withDuckDB(async (conn) => {
      const profile = await profileParquetFile(conn, parquetPath);
      return await computeDatasetKpis(conn, parquetPath, profile.columns, {
        filterSql,
        dateColumn,
      });
    });

    return NextResponse.json({ kpis });
  } catch (err: any) {
    console.error("KPI calculation error (GET):", err);
    return NextResponse.json(
      { error: err.message || "Failed to calculate KPIs" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id: datasetId } = await params;

    const body = await req.json().catch(() => ({}));
    const { filterSql, dateColumn } = body;

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

    const kpis = await withDuckDB(async (conn) => {
      const profile = await profileParquetFile(conn, parquetPath);
      return await computeDatasetKpis(conn, parquetPath, profile.columns, {
        filterSql,
        dateColumn,
      });
    });

    return NextResponse.json({ kpis });
  } catch (err: any) {
    console.error("KPI calculation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to calculate KPIs" },
      { status: 500 },
    );
  }
}
