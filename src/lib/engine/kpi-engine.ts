import { type DuckDBConnection } from "@duckdb/node-api";
import { queryDuckDB } from "./duckdb";
import { type ColumnProfile } from "./profile";

export interface KpiMetric {
  id: string;
  name: string;
  column: string;
  aggregation: "sum" | "avg" | "count" | "count_distinct" | "min" | "max";
  value: number;
  formattedValue: string;
  previousPeriodValue?: number | null;
  percentageChange?: number | null;
  trendDirection?: "up" | "down" | "flat";
  isPositiveChange?: boolean;
  sparkline: number[];
  format: "currency" | "percentage" | "number" | "integer";
  description?: string;
}

export interface KpiComputeOptions {
  dateColumn?: string;
  dateRange?: { from?: string; to?: string };
  filterSql?: string;
}

/**
 * Calculate dynamic KPIs for a Parquet dataset.
 */
export async function computeDatasetKpis(
  conn: DuckDBConnection,
  parquetPath: string,
  columns: ColumnProfile[],
  options: KpiComputeOptions = {},
): Promise<KpiMetric[]> {
  const normPath = parquetPath.replace(/\\/g, "/");
  const temporalCol =
    options.dateColumn ??
    columns.find((c) => c.role === "temporal")?.name;

  const measures = columns.filter((c) => c.role === "measure");
  const identifiers = columns.filter((c) => c.role === "identifier");

  const kpiDefinitions: Array<{
    id: string;
    name: string;
    col: string;
    agg: "sum" | "avg" | "count" | "count_distinct" | "min" | "max";
    format: "currency" | "percentage" | "number" | "integer";
  }> = [];

  // 1. Total row count / record count
  kpiDefinitions.push({
    id: "total_records",
    name: "Total Records",
    col: "*",
    agg: "count",
    format: "integer",
  });

  // 2. Primary identifiers (e.g. Unique Customers, Unique Orders, Unique Products)
  for (const idCol of identifiers.slice(0, 2)) {
    kpiDefinitions.push({
      id: `unique_${idCol.name}`,
      name: `Active ${formatKpiTitle(idCol.name)}s`,
      col: idCol.name,
      agg: "count_distinct",
      format: "integer",
    });
  }

  // 3. Top Measures (Revenue, Profit, Sales, Quantities, Costs)
  for (const m of measures.slice(0, 4)) {
    const isAvg =
      m.inferredType === "percentage" ||
      m.name.toLowerCase().includes("avg") ||
      m.name.toLowerCase().includes("rate") ||
      m.name.toLowerCase().includes("margin");

    kpiDefinitions.push({
      id: `measure_${m.name}`,
      name: `${isAvg ? "Average" : "Total"} ${formatKpiTitle(m.name)}`,
      col: m.name,
      agg: isAvg ? "avg" : "sum",
      format: m.inferredType === "currency" ? "currency" : m.inferredType === "percentage" ? "percentage" : "number",
    });
  }

  const results: KpiMetric[] = [];

  for (const def of kpiDefinitions) {
    const expr =
      def.agg === "count"
        ? "COUNT(*)"
        : def.agg === "count_distinct"
          ? `COUNT(DISTINCT "${def.col.replace(/"/g, '""')}")`
          : `${def.agg.toUpperCase()}("${def.col.replace(/"/g, '""')}")`;

    const whereClause = options.filterSql ? `WHERE ${options.filterSql}` : "";

    // Current value
    const curSql = `
      SELECT ${expr} as val 
      FROM read_parquet('${normPath}') 
      ${whereClause}
    `;

    const curRes = await queryDuckDB<{ val: any }>(conn, curSql);
    const rawVal = Number(curRes[0]?.val ?? 0);
    const value = isNaN(rawVal) ? 0 : Number(rawVal.toFixed(2));

    // Sparkline & MoM growth if temporal column exists
    let sparkline: number[] = [];
    let previousPeriodValue: number | null = null;
    let percentageChange: number | null = null;
    let trendDirection: "up" | "down" | "flat" = "flat";
    let isPositiveChange = true;

    if (temporalCol) {
      try {
        const sparkSql = `
          SELECT 
            strftime(TRY_CAST("${temporalCol}" AS TIMESTAMP), '%Y-%m') as period,
            ${expr} as val
          FROM read_parquet('${normPath}')
          WHERE "${temporalCol}" IS NOT NULL ${options.filterSql ? `AND (${options.filterSql})` : ""}
          GROUP BY period
          ORDER BY period ASC
          LIMIT 12;
        `;
        const sparkRes = await queryDuckDB<{ period: string; val: any }>(conn, sparkSql);
        sparkline = sparkRes.map((r) => Number(Number(r.val ?? 0).toFixed(2)));

        if (sparkline.length >= 2) {
          const latest = sparkline[sparkline.length - 1] ?? 0;
          const previous = sparkline[sparkline.length - 2] ?? 0;
          previousPeriodValue = previous;

          if (previous !== 0) {
            percentageChange = Number((((latest - previous) / Math.abs(previous)) * 100).toFixed(1));
            trendDirection = percentageChange > 0.5 ? "up" : percentageChange < -0.5 ? "down" : "flat";
            isPositiveChange = def.name.toLowerCase().includes("cost") || def.name.toLowerCase().includes("expense")
              ? percentageChange <= 0
              : percentageChange >= 0;
          }
        }
      } catch {
        sparkline = [value, value, value];
      }
    }

    if (sparkline.length === 0) {
      sparkline = [value];
    }

    results.push({
      id: def.id,
      name: def.name,
      column: def.col,
      aggregation: def.agg,
      value,
      formattedValue: formatKpiValue(value, def.format),
      previousPeriodValue,
      percentageChange,
      trendDirection,
      isPositiveChange,
      sparkline,
      format: def.format,
    });
  }

  return results;
}

export function formatKpiValue(
  val: number,
  format: "currency" | "percentage" | "number" | "integer",
): string {
  if (val === null || val === undefined || isNaN(val)) return "—";

  if (format === "currency") {
    if (Math.abs(val) >= 1_000_000_000) {
      return `$${(val / 1_000_000_000).toFixed(2)}B`;
    }
    if (Math.abs(val) >= 1_000_000) {
      return `$${(val / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(val) >= 1_000) {
      return `$${(val / 1_000).toFixed(1)}K`;
    }
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  if (format === "percentage") {
    return `${val.toFixed(1)}%`;
  }

  if (format === "integer") {
    return Math.round(val).toLocaleString();
  }

  if (Math.abs(val) >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(val) >= 1_000) {
    return `${(val / 1_000).toFixed(1)}K`;
  }
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatKpiTitle(col: string): string {
  return col
    .replace(/^id_|_id$/gi, "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
