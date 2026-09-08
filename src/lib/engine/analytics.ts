import { type DuckDBConnection } from "@duckdb/node-api";
import { queryDuckDB } from "./duckdb";
import { statSync } from "node:fs";

const CHART_CACHE = new Map<string, { result: ChartResult; mtimeMs: number }>();

function buildChartCacheKey(params: ChartAggregationParams): string {
  const normPath = params.parquetPath.replace(/\\/g, "/");
  return `${normPath}::${params.chartType}::${params.dimension || ""}::${params.measure || ""}::${params.secondaryMeasure || ""}::${params.aggregation || "sum"}::${params.timeBucket || "month"}::${params.filterSql || ""}::${params.limit || 50}::${params.sortOrder || "desc"}`;
}

export function getCachedChartData(params: ChartAggregationParams): ChartResult | null {
  try {
    const fileMtimeMs = statSync(params.parquetPath).mtimeMs;
    const key = buildChartCacheKey(params);
    const cached = CHART_CACHE.get(key);
    if (cached && cached.mtimeMs === fileMtimeMs) {
      return cached.result;
    }
  } catch {}
  return null;
}

export interface ChartAggregationParams {
  parquetPath: string;
  chartType: "bar" | "line" | "area" | "donut" | "scatter" | "radar" | "table";
  dimension?: string;
  measure?: string;
  secondaryMeasure?: string;
  aggregation?: "sum" | "avg" | "count" | "min" | "max";
  timeBucket?: "day" | "week" | "month" | "quarter" | "year";
  filterSql?: string;
  limit?: number;
  sortOrder?: "asc" | "desc";
}

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  count?: number;
  percentage?: number;
  isAnomaly?: boolean;
  lowerBound?: number;
  upperBound?: number;
}

export interface ChartResult {
  chartType: string;
  dimension: string;
  measure: string;
  aggregation: string;
  data: ChartDataPoint[];
  totalValue: number;
  averageValue: number;
  maxValue: number;
  minValue: number;
}

/**
 * Generate aggregated chart data directly with DuckDB.
 */
export async function getChartData(
  conn: DuckDBConnection,
  params: ChartAggregationParams,
): Promise<ChartResult> {
  const cached = getCachedChartData(params);
  if (cached) {
    return cached;
  }

  let fileMtimeMs = 0;
  try {
    fileMtimeMs = statSync(params.parquetPath).mtimeMs;
  } catch {}

  const normPath = params.parquetPath.replace(/\\/g, "/");
  const agg = params.aggregation ?? "sum";
  const limit = Math.min(params.limit ?? 50, 200);
  const where = params.filterSql ? `WHERE ${params.filterSql}` : "";

  const dim = params.dimension ? `"${params.dimension.replace(/"/g, '""')}"` : null;
  const meas = params.measure ? `"${params.measure.replace(/"/g, '""')}"` : null;
  const secMeas = params.secondaryMeasure ? `"${params.secondaryMeasure.replace(/"/g, '""')}"` : null;

  const measExpr = meas
    ? agg === "count"
      ? "COUNT(*)"
      : `${agg.toUpperCase()}(TRY_CAST(${meas} AS DOUBLE))`
    : "COUNT(*)";

  let sql = "";

  // 1. Line / Area / Time-series chart
  if (params.chartType === "line" || params.chartType === "area") {
    const bucketFmt =
      params.timeBucket === "day"
        ? "%Y-%m-%d"
        : params.timeBucket === "week"
          ? "%Y-W%W"
          : params.timeBucket === "quarter"
            ? "%Y-Q"
            : params.timeBucket === "year"
              ? "%Y"
              : "%Y-%m";

    const dateCol = dim ?? 'CURRENT_DATE';
    sql = `
      SELECT 
        strftime(TRY_CAST(${dateCol} AS TIMESTAMP), '${bucketFmt}') as label,
        ${measExpr} as value,
        ${secMeas ? `AVG(TRY_CAST(${secMeas} AS DOUBLE)) as secondary_value,` : ""}
        COUNT(*) as count
      FROM read_parquet('${normPath}')
      ${where ? `${where} AND ${dateCol} IS NOT NULL` : `WHERE ${dateCol} IS NOT NULL`}
      GROUP BY 1
      ORDER BY 1 ASC
      LIMIT ${limit}
    `;
  } else if (params.chartType === "scatter") {
    // 2. Scatter plot (X = measure, Y = secondaryMeasure)
    const xExpr = measExpr;
    const yExpr = secMeas ? `AVG(TRY_CAST(${secMeas} AS DOUBLE))` : "1";
    const groupCol = dim ?? "'Point'";

    sql = `
      SELECT 
        ${groupCol} as label,
        ${xExpr} as value,
        ${yExpr} as secondary_value,
        COUNT(*) as count
      FROM read_parquet('${normPath}')
      ${where}
      GROUP BY 1
      ORDER BY value DESC
      LIMIT ${limit}
    `;
  } else {
    // 3. Bar / Donut / Radar / Generic categorical aggregation
    const groupCol = dim ?? "'Total'";
    const sort = params.sortOrder === "asc" ? "ASC" : "DESC";

    sql = `
      SELECT 
        COALESCE(CAST(${groupCol} AS VARCHAR), 'Unknown') as label,
        ${measExpr} as value,
        ${secMeas ? `AVG(TRY_CAST(${secMeas} AS DOUBLE)) as secondary_value,` : ""}
        COUNT(*) as count
      FROM read_parquet('${normPath}')
      ${where}
      GROUP BY 1
      ORDER BY value ${sort}
      LIMIT ${limit}
    `;
  }

  const rawRows = await queryDuckDB<{
    label: any;
    value: any;
    secondary_value?: any;
    count?: any;
  }>(conn, sql);

  // Compute summary stats and anomaly bounds (z-score on values)
  const values = rawRows.map((r) => Number(r.value ?? 0)).filter((v) => !isNaN(v));
  const sumVal = values.reduce((acc, v) => acc + v, 0);
  const mean = values.length > 0 ? sumVal / values.length : 0;
  const variance =
    values.length > 1
      ? values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (values.length - 1)
      : 0;
  const stdDev = Math.sqrt(variance);
  const zScoreThreshold = 2.0;

  const data: ChartDataPoint[] = rawRows.map((r) => {
    const v = Number(r.value ?? 0);
    const num = isNaN(v) ? 0 : Number(v.toFixed(2));
    const secV = r.secondary_value != null ? Number(Number(r.secondary_value).toFixed(2)) : undefined;
    const isAnomaly = stdDev > 0 && Math.abs(num - mean) / stdDev > zScoreThreshold;

    return {
      label: String(r.label || "N/A"),
      value: num,
      secondaryValue: secV,
      count: r.count != null ? Number(r.count) : undefined,
      percentage: sumVal > 0 ? Number(((num / sumVal) * 100).toFixed(1)) : 0,
      isAnomaly,
      lowerBound: Number(Math.max(0, mean - 1.96 * stdDev).toFixed(2)),
      upperBound: Number((mean + 1.96 * stdDev).toFixed(2)),
    };
  });

  const result: ChartResult = {
    chartType: params.chartType,
    dimension: params.dimension ?? "All",
    measure: params.measure ?? "Count",
    aggregation: agg,
    data,
    totalValue: Number(sumVal.toFixed(2)),
    averageValue: Number(mean.toFixed(2)),
    maxValue: values.length > 0 ? Math.max(...values) : 0,
    minValue: values.length > 0 ? Math.min(...values) : 0,
  };

  if (fileMtimeMs > 0) {
    CHART_CACHE.set(buildChartCacheKey(params), { result, mtimeMs: fileMtimeMs });
  }

  return result;
}
