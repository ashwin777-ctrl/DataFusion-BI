import ExcelJS from "exceljs";
import { type DuckDBConnection } from "@duckdb/node-api";
import { queryDuckDB } from "./duckdb";
import { type DatasetProfile } from "./profile";
import { type KpiMetric } from "./kpi-engine";
import { type InsightsReport } from "./insights";

export interface ExportOptions {
  format: "pdf" | "xlsx" | "csv";
  title?: string;
  filterSql?: string;
  limit?: number;
}

/**
 * Generate a clean CSV export buffer.
 */
export async function exportToCsv(
  conn: DuckDBConnection,
  parquetPath: string,
  filterSql?: string,
  limit: number = 50000,
): Promise<Buffer> {
  const normPath = parquetPath.replace(/\\/g, "/");
  const where = filterSql ? `WHERE ${filterSql}` : "";
  const sql = `SELECT * FROM read_parquet('${normPath}') ${where} LIMIT ${limit}`;

  const rows = await queryDuckDB<Record<string, any>>(conn, sql);
  if (rows.length === 0 || !rows[0]) {
    return Buffer.from("");
  }

  const headers = Object.keys(rows[0]);
  const lines: string[] = [];
  lines.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","));

  for (const row of rows) {
    const vals = headers.map((h) => {
      const v = row[h];
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    });
    lines.push(vals.join(","));
  }

  return Buffer.from(lines.join("\n"), "utf8");
}

/**
 * Generate a formatted, multi-tab Excel (.xlsx) workbook buffer with KPI Summary and Raw Data.
 */
export async function exportToExcel(
  conn: DuckDBConnection,
  parquetPath: string,
  profile: DatasetProfile,
  kpis: KpiMetric[],
  title: string = "Business Intelligence Report",
): Promise<Buffer> {
  const normPath = parquetPath.replace(/\\/g, "/");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Confluence BI Platform";
  workbook.created = new Date();

  // 1. Executive Summary Sheet
  const summarySheet = workbook.addWorksheet("KPI & Executive Summary");
  summarySheet.views = [{ showGridLines: true }];

  // Title styling
  summarySheet.mergeCells("A1:E1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = title;
  titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FF1E293B" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  summarySheet.getRow(1).height = 35;

  summarySheet.getCell("A2").value = `Generated: ${new Date().toLocaleDateString()} | Total Records: ${profile.rowCount.toLocaleString()} | Data Quality: ${profile.qualityScore}%`;
  summarySheet.getCell("A2").font = { name: "Arial", size: 10, italic: true, color: { argb: "FF64748B" } };
  summarySheet.getRow(2).height = 20;

  // KPI Table Header
  summarySheet.getRow(4).values = ["KPI Metric", "Aggregation", "Primary Column", "Current Value", "Growth / Trend"];
  summarySheet.getRow(4).font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  summarySheet.getRow(4).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" },
  };
  summarySheet.getRow(4).height = 25;

  let rowIdx = 5;
  for (const kpi of kpis) {
    summarySheet.getRow(rowIdx).values = [
      kpi.name,
      kpi.aggregation.toUpperCase(),
      kpi.column,
      kpi.formattedValue,
      kpi.percentageChange !== null && kpi.percentageChange !== undefined
        ? `${kpi.percentageChange > 0 ? "+" : ""}${kpi.percentageChange}%`
        : "—",
    ];
    summarySheet.getRow(rowIdx).height = 20;
    rowIdx++;
  }

  summarySheet.columns = [
    { key: "a", width: 28 },
    { key: "b", width: 16 },
    { key: "c", width: 22 },
    { key: "d", width: 20 },
    { key: "e", width: 18 },
  ];

  // 2. Raw Data Sheet
  const dataSheet = workbook.addWorksheet("Raw Dataset");
  const rawRows = await queryDuckDB<Record<string, any>>(
    conn,
    `SELECT * FROM read_parquet('${normPath}') LIMIT 10000`,
  );

  if (rawRows.length > 0 && rawRows[0]) {
    const headers = Object.keys(rawRows[0]);
    dataSheet.getRow(1).values = headers;
    dataSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    dataSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" },
    };
    dataSheet.getRow(1).height = 24;

    for (let i = 0; i < rawRows.length; i++) {
      const rowItem = rawRows[i];
      if (rowItem) {
        const rowVals = headers.map((h) => rowItem[h]);
        dataSheet.getRow(i + 2).values = rowVals;
      }
    }

    dataSheet.columns = headers.map((h) => ({
      key: h,
      width: Math.max(h.length + 4, 14),
    }));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generate a clean, printable HTML document suitable for browser printing / PDF generation.
 */
export function generatePrintableReportHtml(params: {
  title: string;
  datasetName: string;
  profile: DatasetProfile;
  kpis: KpiMetric[];
  insights: InsightsReport;
}): string {
  const { title, datasetName, profile, kpis, insights } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${datasetName}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      margin: 0;
      padding: 24px;
      background: #fff;
    }
    .header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .title { font-size: 24px; font-weight: 700; margin: 0; }
    .meta { font-size: 13px; color: #64748b; margin-top: 4px; }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #334155;
      margin-top: 24px;
      margin-bottom: 12px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      background: #f8fafc;
    }
    .kpi-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; }
    .kpi-value { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 4px; }
    .kpi-trend { font-size: 12px; font-weight: 500; margin-top: 2px; }
    .trend-up { color: #16a34a; }
    .trend-down { color: #dc2626; }
    .summary-box {
      background: #eff6ff;
      border-left: 4px solid #2563eb;
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .finding-item {
      font-size: 13px;
      margin-bottom: 6px;
      padding-left: 12px;
      position: relative;
    }
    .finding-item::before {
      content: "•";
      position: absolute;
      left: 0;
      color: #2563eb;
      font-weight: bold;
    }
    .insight-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .insight-header { display: flex; justify-content: space-between; font-weight: 600; font-size: 14px; }
    .insight-desc { font-size: 13px; color: #475569; margin-top: 4px; }
    .insight-rec { font-size: 12px; color: #1e40af; background: #dbeafe; padding: 6px 10px; border-radius: 4px; margin-top: 8px; }
    .footer {
      margin-top: 40px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="title">${title}</h1>
    <div class="meta">Dataset: <strong>${datasetName}</strong> | Records: <strong>${profile.rowCount.toLocaleString()}</strong> | Generated: <strong>${new Date().toLocaleDateString()}</strong></div>
  </div>

  <div class="summary-box">
    <strong>Executive Summary:</strong> ${insights.executiveSummary}
  </div>

  <div class="section-title">Key Performance Indicators</div>
  <div class="kpi-grid">
    ${kpis
      .map(
        (k) => `
      <div class="kpi-card">
        <div class="kpi-label">${k.name}</div>
        <div class="kpi-value">${k.formattedValue}</div>
        ${
          k.percentageChange !== null && k.percentageChange !== undefined
            ? `<div class="kpi-trend ${k.percentageChange >= 0 ? "trend-up" : "trend-down"}">${k.percentageChange >= 0 ? "▲" : "▼"} ${Math.abs(k.percentageChange)}% vs prior</div>`
            : ""
        }
      </div>
    `,
      )
      .join("")}
  </div>

  <div class="section-title">Key Findings</div>
  <div>
    ${insights.keyFindings.map((f) => `<div class="finding-item">${f}</div>`).join("")}
  </div>

  <div class="section-title">Strategic Insights & Action Items</div>
  <div>
    ${insights.insights
      .map(
        (i) => `
      <div class="insight-card">
        <div class="insight-header">
          <span>${i.title}</span>
          <span style="text-transform: uppercase; font-size: 11px; color: ${i.category === "opportunity" ? "#16a34a" : i.category === "risk" ? "#dc2626" : "#2563eb"}">${i.category}</span>
        </div>
        <div class="insight-desc">${i.description}</div>
        ${i.recommendation ? `<div class="insight-rec"><strong>Recommendation:</strong> ${i.recommendation}</div>` : ""}
      </div>
    `,
      )
      .join("")}
  </div>

  <div class="footer">
    Confluence BI Platform • Production Analytical Report • Generated automatically from verified Parquet store
  </div>
</body>
</html>
  `;
}
