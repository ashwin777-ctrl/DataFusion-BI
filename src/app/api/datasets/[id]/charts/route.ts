import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { withDuckDB, resolveDatasetParquetPath, ensureStorageBlob } from "@/lib/engine/duckdb";
import { getChartData, getCachedChartData, type ChartAggregationParams } from "@/lib/engine/analytics";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id: datasetId } = await params;

    const body = (await req.json()) as Omit<ChartAggregationParams, "parquetPath">;
    const { chartType, dimension, measure, secondaryMeasure, aggregation, timeBucket, filterSql, limit, sortOrder } =
      body;

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

    const parquetPath = resolveDatasetParquetPath(orgId, datasetId, dataset.duckdbPath);
    await ensureStorageBlob(parquetPath, dataset.duckdbPath);

    const chartParams: ChartAggregationParams = {
      parquetPath,
      chartType: chartType || "bar",
      dimension,
      measure,
      secondaryMeasure,
      aggregation: aggregation || "sum",
      timeBucket: timeBucket || "month",
      filterSql,
      limit,
      sortOrder,
    };

    // 1. Fast Path: return warm memory-cached chart aggregation if Parquet has not changed
    const cachedChart = getCachedChartData(chartParams);
    if (cachedChart) {
      return NextResponse.json(cachedChart, {
        headers: {
          "Cache-Control": "private, max-age=10, stale-while-revalidate=60",
        },
      });
    }

    const chartResult = await withDuckDB(async (conn) => {
      return await getChartData(conn, chartParams);
    });

    return NextResponse.json(chartResult, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=60",
      },
    });
  } catch (err: any) {
    console.error("Chart aggregation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to aggregate chart data" },
      { status: 500 },
    );
  }
}
