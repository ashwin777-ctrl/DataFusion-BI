import { type DuckDBConnection } from "@duckdb/node-api";
import { queryDuckDB } from "./duckdb";
import { statSync } from "node:fs";

const PROFILE_CACHE = new Map<string, { profile: DatasetProfile; mtimeMs: number }>();

export type ColumnRole = "measure" | "dimension" | "temporal" | "identifier" | "categorical";
export type InferredType =
  | "integer"
  | "float"
  | "currency"
  | "percentage"
  | "date"
  | "timestamp"
  | "boolean"
  | "text"
  | "categorical"
  | "unique_id";

export interface ColumnProfile {
  name: string;
  originalType: string;
  inferredType: InferredType;
  role: ColumnRole;
  rowCount: number;
  nullCount: number;
  nullPercentage: number;
  distinctCount: number;
  isUnique: boolean;
  min: number | string | null;
  max: number | string | null;
  mean?: number | null;
  sum?: number | null;
  stdDev?: number | null;
  sampleValues: any[];
  topValues?: Array<{ value: any; count: number; percentage: number }>;
  suggestedKpi?: {
    aggregation: "sum" | "avg" | "count" | "count_distinct";
    label: string;
    format: "currency" | "number" | "percentage" | "integer";
  };
}

export interface DatasetProfile {
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  measures: ColumnProfile[];
  dimensions: ColumnProfile[];
  temporalColumns: ColumnProfile[];
  identifierColumns: ColumnProfile[];
  qualityScore: number; // 0 - 100
  suggestedPrimaryDate?: string;
  suggestedDefaultDimension?: string;
  suggestedDefaultMeasure?: string;
}

/**
 * Profile a Parquet file staged in DuckDB.
 */
export async function profileParquetFile(
  conn: DuckDBConnection,
  parquetPath: string,
): Promise<DatasetProfile> {
  const normPath = parquetPath.replace(/\\/g, "/");
  let fileMtimeMs = 0;
  try {
    fileMtimeMs = statSync(parquetPath).mtimeMs;
    const cached = PROFILE_CACHE.get(normPath);
    if (cached && cached.mtimeMs === fileMtimeMs) {
      return cached.profile;
    }
  } catch {}

  // 1. Get row count
  const countRes = await queryDuckDB<{ count: number }>(
    conn,
    `SELECT COUNT(*) as count FROM read_parquet('${normPath}')`,
  );
  const totalRows = countRes[0]?.count ?? 0;

  if (totalRows === 0) {
    return {
      rowCount: 0,
      columnCount: 0,
      columns: [],
      measures: [],
      dimensions: [],
      temporalColumns: [],
      identifierColumns: [],
      qualityScore: 100,
    };
  }

  // 2. Describe schema
  const schemaRes = await queryDuckDB<{
    column_name: string;
    column_type: string;
    null: string;
  }>(conn, `DESCRIBE SELECT * FROM read_parquet('${normPath}')`);

  // 3. Sample preview rows (up to 100)
  const sampleRows = await queryDuckDB<Record<string, any>>(
    conn,
    `SELECT * FROM read_parquet('${normPath}') LIMIT 100`,
  );

  const columnProfiles: ColumnProfile[] = [];
  let totalNullCells = 0;
  const totalCells = totalRows * schemaRes.length;

  // 4. Batch all column statistics into a single multi-column aggregation query
  const statsExpressions: string[] = [];
  schemaRes.forEach((col, idx) => {
    const colName = col.column_name;
    const rawType = col.column_type.toLowerCase();
    const escapedCol = `"${colName.replace(/"/g, '""')}"`;
    const isNum =
      rawType.includes("int") ||
      rawType.includes("float") ||
      rawType.includes("double") ||
      rawType.includes("decimal") ||
      rawType.includes("numeric");

    statsExpressions.push(
      `COUNT(DISTINCT ${escapedCol}) as distinct_${idx}`,
      `COUNT(*) - COUNT(${escapedCol}) as null_${idx}`,
      `MIN(${escapedCol}) as min_${idx}`,
      `MAX(${escapedCol}) as max_${idx}`,
      isNum ? `AVG(${escapedCol}) as avg_${idx}` : `NULL as avg_${idx}`,
      isNum ? `SUM(${escapedCol}) as sum_${idx}` : `NULL as sum_${idx}`,
      isNum ? `STDDEV(${escapedCol}) as std_${idx}` : `NULL as std_${idx}`
    );
  });

  let batchedStats: Record<string, any> = {};
  if (statsExpressions.length > 0) {
    try {
      const batchedRes = await queryDuckDB<Record<string, any>>(
        conn,
        `SELECT ${statsExpressions.join(",\n")} FROM read_parquet('${normPath}')`
      );
      batchedStats = batchedRes[0] || {};
    } catch (e) {
      console.error("Batched stats query error:", e);
    }
  }

  for (let idx = 0; idx < schemaRes.length; idx++) {
    const col = schemaRes[idx]!;
    const colName = col.column_name;
    const rawType = col.column_type.toLowerCase();

    const distinctCount = Number(batchedStats[`distinct_${idx}`] ?? 0);
    const nullCount = Number(batchedStats[`null_${idx}`] ?? 0);
    const nullPercentage = totalRows > 0 ? (nullCount / totalRows) * 100 : 0;
    totalNullCells += nullCount;

    // Top frequent values calculated in-memory from sampleRows (instant, 0 DuckDB query overhead)
    const freqMap = new Map<any, number>();
    for (const r of sampleRows) {
      const v = r[colName];
      if (v !== null && v !== undefined) {
        freqMap.set(v, (freqMap.get(v) || 0) + 1);
      }
    }
    const topValues: Array<{ value: any; count: number; percentage: number }> = Array.from(freqMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([val, cnt]) => ({
        value: val,
        count: cnt,
        percentage: sampleRows.length > 0 ? (cnt / sampleRows.length) * 100 : 0,
      }));

    const stats = {
      distinct_count: distinctCount,
      null_count: nullCount,
      min_val: batchedStats[`min_${idx}`] ?? null,
      max_val: batchedStats[`max_${idx}`] ?? null,
      avg_val: batchedStats[`avg_${idx}`] ?? null,
      sum_val: batchedStats[`sum_${idx}`] ?? null,
      std_val: batchedStats[`std_${idx}`] ?? null,
    };

    const samples = sampleRows
      .map((r) => r[colName])
      .filter((v) => v !== null && v !== undefined)
      .slice(0, 10);

    const { inferredType, role, suggestedKpi } = classifyColumn(
      colName,
      rawType,
      distinctCount,
      totalRows,
      samples,
    );

    columnProfiles.push({
      name: colName,
      originalType: rawType,
      inferredType,
      role,
      rowCount: totalRows,
      nullCount,
      nullPercentage: Number(nullPercentage.toFixed(2)),
      distinctCount,
      isUnique: distinctCount === totalRows && nullCount === 0,
      min: stats.min_val,
      max: stats.max_val,
      mean: stats.avg_val != null ? Number(Number(stats.avg_val).toFixed(2)) : null,
      sum: stats.sum_val != null ? Number(Number(stats.sum_val).toFixed(2)) : null,
      stdDev: stats.std_val != null ? Number(Number(stats.std_val).toFixed(2)) : null,
      sampleValues: samples,
      topValues,
      suggestedKpi,
    });
  }

  const measures = columnProfiles.filter((c) => c.role === "measure");
  const dimensions = columnProfiles.filter((c) => c.role === "dimension" || c.role === "categorical");
  const temporalColumns = columnProfiles.filter((c) => c.role === "temporal");
  const identifierColumns = columnProfiles.filter((c) => c.role === "identifier");

  // Pick optimal default date, measure, dimension for instant dashboard generation
  const suggestedPrimaryDate =
    temporalColumns.find((c) =>
      /order_?date|invoice_?date|created_?at|trans_?date|date|timestamp/i.test(c.name),
    )?.name ?? temporalColumns[0]?.name;

  const suggestedDefaultMeasure =
    measures.find((c) =>
      /revenue|sales|total_?amount|amount|profit|net_?sales|price|cost|volume/i.test(
        c.name,
      ),
    )?.name ?? measures[0]?.name;

  const suggestedDefaultDimension =
    dimensions.find((c) =>
      /category|region|country|segment|status|product|channel|dept|state/i.test(
        c.name,
      ),
    )?.name ?? dimensions[0]?.name;

  const qualityScore =
    totalCells > 0
      ? Math.max(0, Math.min(100, Math.round(100 - (totalNullCells / totalCells) * 100)))
      : 100;

  const result: DatasetProfile = {
    rowCount: totalRows,
    columnCount: columnProfiles.length,
    columns: columnProfiles,
    measures,
    dimensions,
    temporalColumns,
    identifierColumns,
    qualityScore,
    suggestedPrimaryDate,
    suggestedDefaultDimension,
    suggestedDefaultMeasure,
  };

  if (fileMtimeMs > 0) {
    PROFILE_CACHE.set(normPath, { profile: result, mtimeMs: fileMtimeMs });
  }

  return result;
}

function classifyColumn(
  name: string,
  rawType: string,
  distinctCount: number,
  totalRows: number,
  samples: any[],
): {
  inferredType: InferredType;
  role: ColumnRole;
  suggestedKpi?: ColumnProfile["suggestedKpi"];
} {
  const lower = name.toLowerCase();

  // 1. Temporal classification
  if (
    rawType.includes("date") ||
    rawType.includes("timestamp") ||
    rawType.includes("time") ||
    lower.endsWith("_date") ||
    lower.endsWith("_at") ||
    lower.startsWith("date_") ||
    lower === "date" ||
    lower === "timestamp" ||
    lower === "day" ||
    lower === "month" ||
    lower === "year" ||
    lower === "period"
  ) {
    return {
      inferredType: rawType.includes("time") ? "timestamp" : "date",
      role: "temporal",
    };
  }

  // 2. Boolean classification
  if (
    rawType.includes("bool") ||
    (distinctCount <= 2 &&
      samples.every((s) => typeof s === "boolean" || s === 0 || s === 1 || s === "true" || s === "false"))
  ) {
    return {
      inferredType: "boolean",
      role: "dimension",
    };
  }

  // 3. ID / Unique Identifier classification
  if (
    lower.endsWith("_id") ||
    lower.startsWith("id_") ||
    lower === "id" ||
    lower === "uuid" ||
    lower === "guid" ||
    lower === "key" ||
    lower.endsWith("_key") ||
    lower.endsWith("_code") ||
    lower === "sku" ||
    lower === "code" ||
    (distinctCount === totalRows && totalRows > 20)
  ) {
    return {
      inferredType: "unique_id",
      role: "identifier",
      suggestedKpi: {
        aggregation: "count_distinct",
        label: `Total ${formatDisplayName(name)}s`,
        format: "integer",
      },
    };
  }

  // 4. Numeric Classification
  const isNumeric =
    rawType.includes("int") ||
    rawType.includes("float") ||
    rawType.includes("double") ||
    rawType.includes("decimal") ||
    rawType.includes("numeric") ||
    rawType.includes("hugeint");

  if (isNumeric) {
    if (lower === "year" || lower === "yr") {
      return { inferredType: "integer", role: "temporal" };
    }
    if (lower === "zip" || lower === "zipcode" || lower === "postal_code" || lower === "phone") {
      return { inferredType: "text", role: "dimension" };
    }

    if (
      lower.includes("price") ||
      lower.includes("cost") ||
      lower.includes("revenue") ||
      lower.includes("amount") ||
      lower.includes("profit") ||
      lower.includes("margin") ||
      lower.includes("salary") ||
      lower.includes("budget") ||
      lower.includes("spend") ||
      lower.includes("total") ||
      lower.includes("discount") ||
      lower.includes("fee")
    ) {
      return {
        inferredType: "currency",
        role: "measure",
        suggestedKpi: {
          aggregation: lower.includes("price") || lower.includes("margin") ? "avg" : "sum",
          label: `Total ${formatDisplayName(name)}`,
          format: "currency",
        },
      };
    }

    if (lower.includes("pct") || lower.includes("percent") || lower.includes("rate") || lower.includes("ratio")) {
      return {
        inferredType: "percentage",
        role: "measure",
        suggestedKpi: {
          aggregation: "avg",
          label: `Average ${formatDisplayName(name)}`,
          format: "percentage",
        },
      };
    }

    const isInteger = rawType.includes("int");
    return {
      inferredType: isInteger ? "integer" : "float",
      role: "measure",
      suggestedKpi: {
        aggregation: lower.includes("avg") || lower.includes("score") || lower.includes("rating") ? "avg" : "sum",
        label: `${lower.includes("avg") ? "Average" : "Total"} ${formatDisplayName(name)}`,
        format: isInteger ? "integer" : "number",
      },
    };
  }

  // 5. Categorical vs General Text
  if (distinctCount <= 50 || distinctCount / totalRows < 0.2) {
    return {
      inferredType: "categorical",
      role: "categorical",
    };
  }

  return {
    inferredType: "text",
    role: "dimension",
  };
}

export function formatDisplayName(col: string): string {
  return col
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
