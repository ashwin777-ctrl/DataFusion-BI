import { type DuckDBConnection } from "@duckdb/node-api";
import { queryDuckDB } from "../duckdb";
import type { SupportedFormat, DatasetProfileInfo, ColumnProfile } from "./types";

export async function profileDatasetParquet(
  conn: DuckDBConnection,
  parquetPath: string,
  filename: string,
  format: SupportedFormat,
  byteSize: number,
  _columnHeaderMap: Record<string, string> = {},
): Promise<DatasetProfileInfo> {
  const normPath = parquetPath.replace(/\\/g, "/");

  // Get total rows
  const countRes = await queryDuckDB<{ total: number | string }>(
    conn,
    `SELECT COUNT(*) AS total FROM read_parquet('${normPath}');`,
  );
  const rowCount = Number(countRes[0]?.total ?? 0);

  // Get column schema
  const schemaRes = await queryDuckDB<{ column_name: string; column_type: string }>(
    conn,
    `DESCRIBE SELECT * FROM read_parquet('${normPath}');`,
  );

  const columnProfiles: ColumnProfile[] = [];

  for (const col of schemaRes) {
    const colName = col.column_name;
    const rawType = col.column_type.toUpperCase();

    // Map DuckDB raw type to high-level semantic type
    let inferredType: ColumnProfile["inferredType"] = "string";
    if (rawType.includes("INT") || rawType.includes("HUGEINT")) {
      inferredType = "integer";
    } else if (rawType.includes("DOUBLE") || rawType.includes("FLOAT") || rawType.includes("DECIMAL") || rawType.includes("REAL")) {
      inferredType = "float";
    } else if (rawType.includes("TIMESTAMP")) {
      inferredType = "timestamp";
    } else if (rawType.includes("DATE")) {
      inferredType = "date";
    } else if (rawType.includes("BOOL")) {
      inferredType = "boolean";
    }

    // Column metrics
    let nullCount = 0;
    let distinctCount = 0;
    let minVal: any = null;
    let maxVal: any = null;
    let sampleVals: any[] = [];
    const formattingIssues: string[] = [];

    if (rowCount > 0) {
      const statsRes = await queryDuckDB<{
        nulls: number | string;
        distincts: number | string;
        min_v: any;
        max_v: any;
      }>(
        conn,
        `SELECT
           COUNT(*) - COUNT("${colName}") AS nulls,
           COUNT(DISTINCT "${colName}") AS distincts,
           CAST(MIN("${colName}") AS VARCHAR) AS min_v,
           CAST(MAX("${colName}") AS VARCHAR) AS max_v
         FROM read_parquet('${normPath}');`,
      ).catch(() => [{ nulls: 0, distincts: 0, min_v: null, max_v: null }]);

      if (statsRes[0]) {
        nullCount = Number(statsRes[0].nulls ?? 0);
        distinctCount = Number(statsRes[0].distincts ?? 0);
        minVal = statsRes[0].min_v;
        maxVal = statsRes[0].max_v;
      }

      // Fetch up to 5 distinct non-null samples
      const samplesRes = await queryDuckDB<{ val: any }>(
        conn,
        `SELECT DISTINCT CAST("${colName}" AS VARCHAR) AS val
         FROM read_parquet('${normPath}')
         WHERE "${colName}" IS NOT NULL
         LIMIT 5;`,
      ).catch(() => []);
      sampleVals = samplesRes.map((s) => s.val);

      // Check formatting issues for string fields
      if (inferredType === "string" && sampleVals.length > 0) {
        const hasLeadingZeros = sampleVals.some((v) => /^0[0-9]+$/.test(String(v)));
        if (hasLeadingZeros) {
          formattingIssues.push("Contains leading zeros (e.g. postal codes or padded IDs)");
        }
        const hasWhitespace = sampleVals.some((v) => String(v).trim() !== String(v));
        if (hasWhitespace) {
          formattingIssues.push("Unnormalized leading or trailing whitespace detected");
        }
      }
    }

    const nullPercentage = rowCount > 0 ? (nullCount / rowCount) * 100 : 0;
    const uniquePercentage = rowCount > 0 ? (distinctCount / rowCount) * 100 : 0;
    const isLikelyKey = nullCount === 0 && distinctCount === rowCount && rowCount > 0;

    columnProfiles.push({
      name: colName,
      inferredType,
      nullCount,
      nullPercentage: Math.round(nullPercentage * 10) / 10,
      distinctCount,
      uniquePercentage: Math.round(uniquePercentage * 10) / 10,
      isLikelyKey,
      min: minVal,
      max: maxVal,
      sampleValues: sampleVals,
      formattingIssues,
    });
  }

  // Fetch up to 10 sample records for user preview
  const sampleRecords = rowCount > 0
    ? await queryDuckDB<Record<string, any>>(
        conn,
        `SELECT * FROM read_parquet('${normPath}') LIMIT 10;`,
      ).catch(() => [])
    : [];

  return {
    filename,
    format,
    byteSize,
    rowCount,
    columnCount: columnProfiles.length,
    columns: columnProfiles,
    sampleRecords,
    parquetPath: normPath,
    storageKey: normPath,
    sourceType: "FILE",
    sourceRole: "PRIMARY",
  };
}
