import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type {
  ComparisonSummaryStats,
  ComparisonRecordResult,
  ColumnMappingSuggestion,
  MatchingConfiguration,
} from "./types";

export interface ReportMetadata {
  jobName: string;
  source1Name: string;
  source2Name: string;
  executedAt: string;
  organizationName?: string;
}

/**
 * Generate multi-sheet Excel (.xlsx) comparison report.
 */
export async function generateExcelCompareReport(params: {
  summary: ComparisonSummaryStats;
  results: ComparisonRecordResult[];
  mappings: ColumnMappingSuggestion[];
  config: MatchingConfiguration;
  meta: ReportMetadata;
}): Promise<Buffer> {
  const { summary, results, mappings, config, meta } = params;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DataFusion BI Enterprise";
  workbook.created = new Date();

  const headerFont = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  const headerFill = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "FF0F172A" }, // Slate 900
  };
  const altRowFill = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "FFF8FAFC" }, // Slate 50
  };

  // ─── Sheet 1: Summary ───────────────────────────────────────────────────────
  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.views = [{ showGridLines: true }];

  summarySheet.mergeCells("A1:F1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = `DataFusion Compare Executive Report: ${meta.jobName}`;
  titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FF0071E3" } };
  titleCell.alignment = { vertical: "middle" };

  summarySheet.addRow([]);
  summarySheet.addRow(["Report Generated", meta.executedAt]);
  summarySheet.addRow(["Source 1 File", meta.source1Name]);
  summarySheet.addRow(["Source 2 File", meta.source2Name]);
  summarySheet.addRow(["Comparison Duration", `${summary.durationMs} ms`]);
  summarySheet.addRow([]);

  // KPIs
  summarySheet.addRow(["Metric", "Count", "Percentage"]);
  summarySheet.getRow(7).font = headerFont;
  summarySheet.getRow(7).fill = headerFill;

  const kpis = [
    ["Total Records (Source 1)", summary.totalSource1, "100%"],
    ["Total Records (Source 2)", summary.totalSource2, "100%"],
    ["Matched Records", summary.matchedCount, `${summary.matchRate}%`],
    ["Mismatched Records", summary.mismatchedCount, `${Math.round((summary.mismatchedCount / Math.max(summary.totalSource1, 1)) * 1000) / 10}%`],
    ["Orphans (Source 1 Only)", summary.orphanSource1Count, `${Math.round((summary.orphanSource1Count / Math.max(summary.totalSource1, 1)) * 1000) / 10}%`],
    ["Orphans (Source 2 Only)", summary.orphanSource2Count, `${Math.round((summary.orphanSource2Count / Math.max(summary.totalSource2, 1)) * 1000) / 10}%`],
    ["Duplicate Records", summary.duplicateCount, "—"],
    ["Overall Data Quality Score", `${summary.qualityScore} / 100`, "—"],
  ];

  for (const kpi of kpis) {
    summarySheet.addRow(kpi);
  }

  summarySheet.columns = [
    { width: 32 },
    { width: 22 },
    { width: 18 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
  ];

  // ─── Sheet 2: Matches ───────────────────────────────────────────────────────
  const matchesSheet = workbook.addWorksheet("Matches");
  matchesSheet.views = [{ showGridLines: true }];
  const matchRows = results.filter((r) => r.status === "matched");

  const matchCols = ["Record Key", ...mappings.filter((m) => !m.ignored && m.source2Column).map((m) => m.source1Column)];
  matchesSheet.addRow(matchCols);
  matchesSheet.getRow(1).font = headerFont;
  matchesSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } }; // Emerald 700

  for (let i = 0; i < Math.min(matchRows.length, 5000); i++) {
    const r = matchRows[i]!;
    const rowData = [r.recordKey];
    for (const col of matchCols.slice(1)) {
      rowData.push(r.source1Record?.[col] ?? "");
    }
    const added = matchesSheet.addRow(rowData);
    if (i % 2 === 1) added.fill = altRowFill;
  }
  matchesSheet.columns = matchCols.map(() => ({ width: 20 }));

  // ─── Sheet 3: Mismatches ───────────────────────────────────────────────────
  const mismatchSheet = workbook.addWorksheet("Mismatches");
  mismatchSheet.views = [{ showGridLines: true }];
  const mismatchRows = results.filter((r) => r.status === "mismatched");

  mismatchSheet.addRow(["Record Key", "Field", "Source 1 Value", "Source 2 Value", "Difference Amount", "Status / Reason"]);
  mismatchSheet.getRow(1).font = headerFont;
  mismatchSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB91C1C" } }; // Red 700

  let mIdx = 0;
  for (const r of mismatchRows.slice(0, 5000)) {
    for (const diff of r.differences) {
      if (diff.status === "mismatch") {
        const added = mismatchSheet.addRow([
          r.recordKey,
          diff.field,
          diff.source1Value !== null && diff.source1Value !== undefined ? String(diff.source1Value) : "<NULL>",
          diff.source2Value !== null && diff.source2Value !== undefined ? String(diff.source2Value) : "<NULL>",
          diff.differenceAmount !== null && diff.differenceAmount !== undefined ? String(diff.differenceAmount) : "—",
          diff.reason || "Mismatch",
        ]);
        if (mIdx % 2 === 1) added.fill = altRowFill;
        mIdx++;
      }
    }
  }
  mismatchSheet.columns = [{ width: 20 }, { width: 22 }, { width: 24 }, { width: 24 }, { width: 18 }, { width: 35 }];

  // ─── Sheet 4: Orphans-Source1 ──────────────────────────────────────────────
  const s1OrphansSheet = workbook.addWorksheet("Orphans-Source1");
  s1OrphansSheet.views = [{ showGridLines: true }];
  const s1OrphanRows = results.filter((r) => r.status === "orphan_source1");

  const s1Headers = ["Record Key", ...Object.keys(s1OrphanRows[0]?.source1Record || {})];
  s1OrphansSheet.addRow(s1Headers);
  s1OrphansSheet.getRow(1).font = headerFont;
  s1OrphansSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC2410C" } }; // Orange 700

  for (let i = 0; i < Math.min(s1OrphanRows.length, 5000); i++) {
    const r = s1OrphanRows[i]!;
    const rowData = [r.recordKey];
    for (const h of s1Headers.slice(1)) {
      rowData.push(r.source1Record?.[h] ?? "");
    }
    const added = s1OrphansSheet.addRow(rowData);
    if (i % 2 === 1) added.fill = altRowFill;
  }
  s1OrphansSheet.columns = s1Headers.map(() => ({ width: 20 }));

  // ─── Sheet 5: Orphans-Source2 ──────────────────────────────────────────────
  const s2OrphansSheet = workbook.addWorksheet("Orphans-Source2");
  s2OrphansSheet.views = [{ showGridLines: true }];
  const s2OrphanRows = results.filter((r) => r.status === "orphan_source2");

  const s2Headers = ["Record Key", ...Object.keys(s2OrphanRows[0]?.source2Record || {})];
  s2OrphansSheet.addRow(s2Headers);
  s2OrphansSheet.getRow(1).font = headerFont;
  s2OrphansSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } }; // Indigo 700

  for (let i = 0; i < Math.min(s2OrphanRows.length, 5000); i++) {
    const r = s2OrphanRows[i]!;
    const rowData = [r.recordKey];
    for (const h of s2Headers.slice(1)) {
      rowData.push(r.source2Record?.[h] ?? "");
    }
    const added = s2OrphansSheet.addRow(rowData);
    if (i % 2 === 1) added.fill = altRowFill;
  }
  s2OrphansSheet.columns = s2Headers.map(() => ({ width: 20 }));

  // ─── Sheet 6: Duplicates ───────────────────────────────────────────────────
  const dupSheet = workbook.addWorksheet("Duplicates");
  dupSheet.views = [{ showGridLines: true }];
  dupSheet.addRow(["Dataset Source", "Duplicate Key", "Occurrences"]);
  dupSheet.getRow(1).font = headerFont;
  dupSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6B21A8" } }; // Purple 700

  summary.duplicateGroups.forEach((dg, i) => {
    const added = dupSheet.addRow([dg.source === "source1" ? "Source 1" : "Source 2", dg.key, dg.occurrences]);
    if (i % 2 === 1) added.fill = altRowFill;
  });
  dupSheet.columns = [{ width: 20 }, { width: 30 }, { width: 15 }];

  // ─── Sheet 7: Data Quality ─────────────────────────────────────────────────
  const dqSheet = workbook.addWorksheet("Data Quality");
  dqSheet.views = [{ showGridLines: true }];
  dqSheet.addRow(["Quality Dimension", "Score (0 - 100%)"]);
  dqSheet.getRow(1).font = headerFont;
  dqSheet.getRow(1).fill = headerFill;

  const q = summary.qualityBreakdown;
  dqSheet.addRow(["Completeness (Non-null)", `${q.completeness}%`]);
  dqSheet.addRow(["Uniqueness (Non-duplicate)", `${q.uniqueness}%`]);
  dqSheet.addRow(["Validity (Conformity)", `${q.validity}%`]);
  dqSheet.addRow(["Consistency (Record Pairs)", `${q.consistency}%`]);
  dqSheet.addRow(["Total Overall Quality Score", `${q.score} / 100`]);

  dqSheet.addRow([]);
  dqSheet.addRow(["Issue Type", "Severity", "Affected Column", "Description", "Count"]);
  dqSheet.getRow(8).font = headerFont;
  dqSheet.getRow(8).fill = headerFill;

  q.issuesDetected.forEach((issue, i) => {
    const added = dqSheet.addRow([issue.type, issue.severity.toUpperCase(), issue.affectedColumn || "All", issue.description, issue.count || 0]);
    if (i % 2 === 1) added.fill = altRowFill;
  });
  dqSheet.columns = [{ width: 25 }, { width: 15 }, { width: 25 }, { width: 45 }, { width: 12 }];

  // ─── Sheet 8: Column Mapping ───────────────────────────────────────────────
  const mappingSheet = workbook.addWorksheet("Column Mapping");
  mappingSheet.views = [{ showGridLines: true }];
  mappingSheet.addRow(["Source 1 Column", "Source 2 Column", "Similarity", "Method", "Is Key", "Match Mode", "Configuration"]);
  mappingSheet.getRow(1).font = headerFont;
  mappingSheet.getRow(1).fill = headerFill;

  mappings.forEach((m, i) => {
    const rule = config.columnRules[m.source1Column] || { mode: "exact" };
    const confDesc =
      rule.mode === "numeric_tolerance"
        ? `Tolerance: ±${rule.numericToleranceValue}${rule.numericToleranceType === "percentage" ? "%" : ""}`
        : rule.mode === "date_proximity"
          ? `Date window: ±${rule.dateWindowDays} days`
          : rule.mode === "fuzzy"
            ? `Threshold: ${(rule.fuzzyThreshold ?? 0.85) * 100}%`
            : "Exact";

    const added = mappingSheet.addRow([
      m.source1Column,
      m.source2Column || "<Unmapped>",
      `${Math.round(m.detectedSimilarity * 100)}%`,
      m.mappingMethod,
      m.isKey ? "YES" : "NO",
      rule.mode.toUpperCase(),
      confDesc,
    ]);
    if (i % 2 === 1) added.fill = altRowFill;
  });
  mappingSheet.columns = [{ width: 25 }, { width: 25 }, { width: 15 }, { width: 15 }, { width: 12 }, { width: 20 }, { width: 30 }];

  const uint8 = await workbook.xlsx.writeBuffer();
  return Buffer.from(uint8);
}

/**
 * Generate interactive standalone HTML comparison report.
 */
export function generateHtmlCompareReport(params: {
  summary: ComparisonSummaryStats;
  results: ComparisonRecordResult[];
  mappings: ColumnMappingSuggestion[];
  config: MatchingConfiguration;
  meta: ReportMetadata;
}): string {
  const { summary, results, mappings, meta } = params;
  const mismatchRows = results.filter((r) => r.status === "mismatched").slice(0, 200);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DataFusion Compare: ${meta.jobName}</title>
  <style>
    :root { --bg: #0F172A; --card: #1E293B; --border: #334155; --text: #F8FAFC; --muted: #94A3B8; --accent: #0071E3; --emerald: #10B981; --red: #EF4444; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 40px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { border-bottom: 1px solid var(--border); padding-bottom: 24px; margin-bottom: 32px; }
    .header h1 { margin: 0 0 8px; font-size: 28px; font-weight: 700; color: #fff; }
    .meta { font-size: 14px; color: var(--muted); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .card .label { font-size: 12px; text-transform: uppercase; color: var(--muted); letter-spacing: 0.05em; margin-bottom: 6px; }
    .card .val { font-size: 28px; font-weight: 700; }
    .table-container { background: var(--card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 32px; }
    .table-header { padding: 16px 20px; font-size: 16px; font-weight: 600; border-bottom: 1px solid var(--border); }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    th { background: rgba(0,0,0,0.2); padding: 12px 16px; color: var(--muted); font-weight: 600; }
    td { padding: 12px 16px; border-bottom: 1px solid var(--border); }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; font-family: monospace; }
    .badge-match { background: rgba(16, 185, 129, 0.15); color: var(--emerald); }
    .badge-mismatch { background: rgba(239, 68, 68, 0.15); color: var(--red); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>DataFusion Compare: ${meta.jobName}</h1>
      <div class="meta">
        Source 1: <strong>${meta.source1Name}</strong> | Source 2: <strong>${meta.source2Name}</strong> | Generated: ${meta.executedAt}
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="label">Match Rate</div>
        <div class="val" style="color: var(--emerald);">${summary.matchRate}%</div>
      </div>
      <div class="card">
        <div class="label">Total Compared</div>
        <div class="val">${summary.totalSource1.toLocaleString()}</div>
      </div>
      <div class="card">
        <div class="label">Matched Records</div>
        <div class="val" style="color: var(--emerald);">${summary.matchedCount.toLocaleString()}</div>
      </div>
      <div class="card">
        <div class="label">Discrepancies</div>
        <div class="val" style="color: var(--red);">${summary.mismatchedCount.toLocaleString()}</div>
      </div>
      <div class="card">
        <div class="label">Source 1 Orphans</div>
        <div class="val">${summary.orphanSource1Count.toLocaleString()}</div>
      </div>
      <div class="card">
        <div class="label">Source 2 Orphans</div>
        <div class="val">${summary.orphanSource2Count.toLocaleString()}</div>
      </div>
      <div class="card">
        <div class="label">Data Quality Score</div>
        <div class="val" style="color: #38BDF8;">${summary.qualityScore} / 100</div>
      </div>
    </div>

    <div class="table-container">
      <div class="table-header">Discrepancies Overview (${summary.mismatchedCount.toLocaleString()} mismatches)</div>
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Field</th>
            <th>Source 1</th>
            <th>Source 2</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          ${mismatchRows
            .flatMap((r) =>
              r.differences
                .filter((d) => d.status === "mismatch")
                .map(
                  (d) => `<tr>
                    <td><strong>${r.recordKey}</strong></td>
                    <td>${d.field}</td>
                    <td style="color: #F87171;">${String(d.source1Value ?? "null")}</td>
                    <td style="color: #60A5FA;">${String(d.source2Value ?? "null")}</td>
                    <td><span class="badge badge-mismatch">${d.reason || "Mismatch"}</span></td>
                  </tr>`,
                ),
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <div class="table-container">
      <div class="table-header">Active Column Mappings (${mappings.length})</div>
      <table>
        <thead>
          <tr>
            <th>Source 1 Column</th>
            <th>Source 2 Column</th>
            <th>Similarity</th>
            <th>Method</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          ${mappings
            .map(
              (m) => `<tr>
                <td>${m.source1Column}</td>
                <td>${m.source2Column || "<unmapped>"}</td>
                <td>${Math.round(m.detectedSimilarity * 100)}%</td>
                <td>${m.mappingMethod}</td>
                <td>${m.isKey ? '<span class="badge badge-match">PRIMARY KEY</span>' : "Attribute"}</td>
              </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate PDF executive summary report buffer.
 */
export async function generatePdfCompareReport(params: {
  summary: ComparisonSummaryStats;
  results: ComparisonRecordResult[];
  meta: ReportMetadata;
}): Promise<Buffer> {
  const { summary, meta } = params;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Title & Header
    doc.fontSize(20).fillColor("#0071E3").text("DataFusion Compare Report", { align: "left" });
    doc.fontSize(10).fillColor("#64748B").text(`Job: ${meta.jobName} | Executed: ${meta.executedAt}`, { align: "left" });
    doc.moveDown(1.5);

    // Summary Box
    doc.rect(40, 95, 532, 100).fill("#F8FAFC").stroke("#E2E8F0");
    doc.fillColor("#0F172A").fontSize(12).text("Executive Summary", 55, 110, { bold: true } as any);

    doc.fontSize(10).fillColor("#334155");
    doc.text(`Source 1: ${meta.source1Name}`, 55, 130);
    doc.text(`Source 2: ${meta.source2Name}`, 55, 145);
    doc.text(`Match Rate: ${summary.matchRate}%`, 55, 160);
    doc.text(`Overall Data Quality Score: ${summary.qualityScore} / 100`, 55, 175);

    doc.text(`Total Source 1: ${summary.totalSource1}`, 320, 130);
    doc.text(`Total Source 2: ${summary.totalSource2}`, 320, 145);
    doc.text(`Matched Records: ${summary.matchedCount}`, 320, 160);
    doc.text(`Discrepancies: ${summary.mismatchedCount}`, 320, 175);

    doc.moveDown(6);
    doc.fontSize(14).fillColor("#0F172A").text("Discrepancy Breakdown");
    doc.moveDown(0.5);

    doc.fontSize(9).fillColor("#64748B");
    doc.text("Top fields with detected mismatches:");
    doc.moveDown(0.5);

    for (const [field, count] of Object.entries(summary.mismatchFieldFrequency).slice(0, 10)) {
      doc.fillColor("#0F172A").text(`• ${field}: ${count} discrepancies`);
    }

    doc.end();
  });
}
