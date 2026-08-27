import ExcelJS from "exceljs";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { withDuckDB, getSourceParquetPath, getOrgStorageDir } from "./duckdb";
import { profileParquetFile, type DatasetProfile } from "./profile";

export interface ParsedSheetInfo {
  sheetName: string;
  rowCount: number;
  columnCount: number;
  columns: string[];
}

export interface IngestFileResult {
  sourceId: string;
  fileName: string;
  fileKind: "xlsx" | "xls" | "csv" | "tsv";
  sheets: ParsedSheetInfo[];
  primaryParquetPath: string;
  profile: DatasetProfile;
}

/**
 * Sanitize column names so they are safe SQL identifiers without collision.
 */
export function sanitizeColumnName(name: string, index: number, seen: Set<string>): string {
  let cleaned = String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");

  if (!cleaned || /^[0-9]/.test(cleaned)) {
    cleaned = `col_${cleaned || index + 1}`;
  }

  let finalName = cleaned;
  let counter = 1;
  while (seen.has(finalName)) {
    finalName = `${cleaned}_${counter++}`;
  }
  seen.add(finalName);
  return finalName;
}

/**
 * Ingest an Excel or CSV file buffer directly into DuckDB and stage as Parquet.
 */
export async function ingestUploadedFile(params: {
  orgId: string;
  sourceId: string;
  fileName: string;
  buffer: Buffer;
  selectedSheet?: string;
}): Promise<IngestFileResult> {
  const { orgId, sourceId, fileName, buffer, selectedSheet } = params;
  const lowerName = fileName.toLowerCase();
  const fileKind = lowerName.endsWith(".xlsx")
    ? "xlsx"
    : lowerName.endsWith(".xls")
      ? "xls"
      : lowerName.endsWith(".tsv")
        ? "tsv"
        : "csv";

  const tempCsvPath = join(
    getOrgStorageDir(orgId),
    "sources",
    `temp_${sourceId}.csv`,
  ).replace(/\\/g, "/");

  const parquetPath = getSourceParquetPath(orgId, sourceId);
  const normParquetPath = parquetPath.replace(/\\/g, "/");

  const sheets: ParsedSheetInfo[] = [];

  if (fileKind === "xlsx" || fileKind === "xls") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    let activeWorksheet: ExcelJS.Worksheet | undefined;

    workbook.eachSheet((worksheet) => {
      const colHeaders: string[] = [];
      const headerRow = worksheet.getRow(1);
      const seen = new Set<string>();

      headerRow.eachCell((cell, colNum) => {
        const val = cell.text || String(cell.value ?? "");
        colHeaders.push(sanitizeColumnName(val, colNum - 1, seen));
      });

      sheets.push({
        sheetName: worksheet.name,
        rowCount: Math.max(0, worksheet.rowCount - 1),
        columnCount: colHeaders.length,
        columns: colHeaders,
      });

      if (selectedSheet) {
        if (worksheet.name === selectedSheet) activeWorksheet = worksheet;
      } else if (!activeWorksheet) {
        activeWorksheet = worksheet;
      }
    });

    if (!activeWorksheet) {
      activeWorksheet = workbook.worksheets[0];
    }

    if (!activeWorksheet) {
      throw new Error("Excel file contains no worksheets");
    }

    // Extract headers and data rows
    const seen = new Set<string>();
    const headers: string[] = [];
    const firstRow = activeWorksheet.getRow(1);
    firstRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const rawHeader = cell.text || String(cell.value ?? `col_${colNumber}`);
      headers.push(sanitizeColumnName(rawHeader, colNumber - 1, seen));
    });

    // Write CSV lines for fast DuckDB ingestion
    const csvLines: string[] = [];
    csvLines.push(headers.map(escapeCsvField).join(","));

    for (let r = 2; r <= activeWorksheet.rowCount; r++) {
      const row = activeWorksheet.getRow(r);
      if (!row || row.cellCount === 0) continue;

      let hasData = false;
      const values: string[] = [];
      for (let c = 1; c <= headers.length; c++) {
        const cell = row.getCell(c);
        let val: any = cell.value;

        if (val === null || val === undefined) {
          values.push("");
          continue;
        }

        hasData = true;
        // Formula results
        if (typeof val === "object" && "result" in val) {
          val = val.result;
        }
        if (val instanceof Date) {
          values.push(val.toISOString().split("T")[0] || "");
        } else {
          values.push(escapeCsvField(String(val)));
        }
      }

      if (hasData) {
        csvLines.push(values.join(","));
      }
    }

    writeFileSync(tempCsvPath, csvLines.join("\n"), "utf8");
  } else {
    // Plain CSV or TSV
    writeFileSync(tempCsvPath, buffer);
    sheets.push({
      sheetName: "Default",
      rowCount: 0,
      columnCount: 0,
      columns: [],
    });
  }

  // Load into DuckDB & write Parquet
  let profile: DatasetProfile;
  try {
    profile = await withDuckDB(async (conn) => {
      const delim = fileKind === "tsv" ? "\\t" : ",";
      await conn.run(
        `CREATE TABLE temp_ingest AS SELECT * FROM read_csv('${tempCsvPath}', header=true, delim='${delim}', auto_detect=true, null_padding=true, ignore_errors=true)`,
      );
      await conn.run(
        `COPY temp_ingest TO '${normParquetPath}' (FORMAT PARQUET, COMPRESSION ZSTD)`,
      );
      await conn.run(`DROP TABLE temp_ingest`);
      return await profileParquetFile(conn, parquetPath);
    });
  } finally {
    try {
      if (readFileSync(tempCsvPath)) {
        unlinkSync(tempCsvPath);
      }
    } catch {
      // ignore
    }
  }

  return {
    sourceId,
    fileName,
    fileKind,
    sheets,
    primaryParquetPath: parquetPath,
    profile,
  };
}

function escapeCsvField(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
