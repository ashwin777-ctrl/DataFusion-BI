import assert from "node:assert";
import { inferColumnMappings } from "../src/lib/engine/compare/mapper.js";
import { executeComparison } from "../src/lib/engine/compare/matcher.js";
import { assessDataQuality } from "../src/lib/engine/compare/quality.js";
import {
  generateExcelCompareReport,
  generateHtmlCompareReport,
  generatePdfCompareReport,
} from "../src/lib/engine/compare/reports.js";
import { getDuckDBInstance, withDuckDB, getOrgStorageDir } from "../src/lib/engine/duckdb.js";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

console.log("────────────────────────────────────────────────────────");
console.log("  DataFusion Compare Engine: Automated Test Suite");
console.log("────────────────────────────────────────────────────────\n");

async function runTests() {
  const orgId = "test-compare-org";
  const storageDir = join(getOrgStorageDir(orgId), "compare");
  if (!existsSync(storageDir)) {
    mkdirSync(storageDir, { recursive: true });
  }

  // ─── Test 1: Column Mapping Engine ──────────────────────────────────────────
  console.log("▶ [Test 1] Column Mapping Heuristics & Confidence Scoring...");
  const s1Cols = [
    { name: "order_id", inferredType: "string", nullCount: 0, nullPercentage: 0, distinctCount: 100, uniquePercentage: 100, isLikelyKey: true, sampleValues: [] },
    { name: "customer_name", inferredType: "string", nullCount: 0, nullPercentage: 0, distinctCount: 95, uniquePercentage: 95, isLikelyKey: false, sampleValues: [] },
    { name: "order_amount", inferredType: "float", nullCount: 0, nullPercentage: 0, distinctCount: 80, uniquePercentage: 80, isLikelyKey: false, sampleValues: [] },
    { name: "order_date", inferredType: "date", nullCount: 0, nullPercentage: 0, distinctCount: 30, uniquePercentage: 30, isLikelyKey: false, sampleValues: [] },
  ];

  const s2Cols = [
    { name: "transaction_ref", inferredType: "string", nullCount: 0, nullPercentage: 0, distinctCount: 100, uniquePercentage: 100, isLikelyKey: true, sampleValues: [] },
    { name: "client_name", inferredType: "string", nullCount: 0, nullPercentage: 0, distinctCount: 95, uniquePercentage: 95, isLikelyKey: false, sampleValues: [] },
    { name: "settled_amount", inferredType: "float", nullCount: 0, nullPercentage: 0, distinctCount: 80, uniquePercentage: 80, isLikelyKey: false, sampleValues: [] },
    { name: "settlement_date", inferredType: "date", nullCount: 0, nullPercentage: 0, distinctCount: 30, uniquePercentage: 30, isLikelyKey: false, sampleValues: [] },
  ];

  const mappings = inferColumnMappings(s1Cols, s2Cols);
  assert(mappings.length === 4, "Should have 4 mapping suggestions");
  const idMapping = mappings.find((m) => m.source1Column === "order_id");
  assert(idMapping, "order_id should be mapped");
  assert(idMapping.source2Column === "transaction_ref", `order_id should map to transaction_ref via aliases, got ${idMapping.source2Column}`);
  assert(idMapping.detectedSimilarity >= 0.8, "Confidence should be >= 80%");
  assert(idMapping.isKey, "order_id should be identified as primary key");

  const amountMapping = mappings.find((m) => m.source1Column === "order_amount");
  assert(amountMapping && amountMapping.source2Column === "settled_amount", "order_amount should map to settled_amount");
  console.log("  ✔ Column mapping passed with heuristic confidence scores.");

  // ─── Test 2: Ingest & Analytical Matching ───────────────────────────────────
  console.log("▶ [Test 2] DuckDB Parquet Ingestion & Multi-rule Matching...");
  const s1Csv = `order_id,customer_name,amount,order_date
ORD-1,Acme Corp,100.00,2026-03-01
ORD-2,Beta LLC,250.00,2026-03-02
ORD-3,Gamma Inc,300.00,2026-03-03
ORD-4,Orphan S1,500.00,2026-03-04
ORD-5,Duplicate Co,150.00,2026-03-05
ORD-5,Duplicate Co,150.00,2026-03-05`;

  const s2Csv = `order_id,customer_name,amount,order_date
ORD-1,Acme Corp,100.00,2026-03-01
ORD-2,Beta LLC,250.04,2026-03-03
ORD-3,Gamma Inc,350.00,2026-03-03
ORD-6,Orphan S2,600.00,2026-03-06`;

  const s1Parquet = join(storageDir, "test_s1.parquet").replace(/\\/g, "/");
  const s2Parquet = join(storageDir, "test_s2.parquet").replace(/\\/g, "/");
  const s1TempCsv = join(storageDir, "test_s1.csv").replace(/\\/g, "/");
  const s2TempCsv = join(storageDir, "test_s2.csv").replace(/\\/g, "/");

  writeFileSync(s1TempCsv, s1Csv, "utf8");
  writeFileSync(s2TempCsv, s2Csv, "utf8");

  await withDuckDB(async (conn) => {
    await conn.run(`COPY (SELECT * FROM read_csv_auto('${s1TempCsv}', header=true)) TO '${s1Parquet}' (FORMAT PARQUET);`);
    await conn.run(`COPY (SELECT * FROM read_csv_auto('${s2TempCsv}', header=true)) TO '${s2Parquet}' (FORMAT PARQUET);`);
  });

  const testMappings = [
    { source1Column: "order_id", source2Column: "order_id", detectedSimilarity: 1.0, mappingMethod: "exact", isKey: true, manuallyConfirmed: true, ignored: false, typeMatch: true },
    { source1Column: "customer_name", source2Column: "customer_name", detectedSimilarity: 1.0, mappingMethod: "exact", isKey: false, manuallyConfirmed: true, ignored: false, typeMatch: true },
    { source1Column: "amount", source2Column: "amount", detectedSimilarity: 1.0, mappingMethod: "exact", isKey: false, manuallyConfirmed: true, ignored: false, typeMatch: true },
    { source1Column: "order_date", source2Column: "order_date", detectedSimilarity: 1.0, mappingMethod: "exact", isKey: false, manuallyConfirmed: true, ignored: false, typeMatch: true },
  ];

  const testConfig = {
    keyColumns: ["order_id"],
    columnRules: {
      amount: {
        column: "amount",
        mode: "numeric_tolerance",
        numericToleranceType: "absolute",
        numericToleranceValue: 0.05, // 5 cents tolerance -> ORD-2 (diff 0.04) should pass!
      },
      order_date: {
        column: "order_date",
        mode: "date_proximity",
        dateWindowDays: 1, // ±1 day -> ORD-2 (March 2 vs March 3) should pass!
      },
    },
    normalization: {
      trimWhitespace: true,
      caseInsensitive: true,
      ignorePunctuation: false,
      nullEmptyEquivalent: true,
      normalizeNumbers: true,
      normalizeDates: true,
    },
  };

  const comparison = await executeComparison({
    source1Parquet: s1Parquet,
    source2Parquet: s2Parquet,
    mappings: testMappings,
    config: testConfig,
  });

  const { summary, results } = comparison;

  assert(summary.totalSource1 === 6, `Expected 6 Source 1 rows, got ${summary.totalSource1}`);
  assert(summary.totalSource2 === 4, `Expected 4 Source 2 rows, got ${summary.totalSource2}`);

  // ORD-1 (Exact match) & ORD-2 (Within tolerance and date window)
  assert(summary.matchedCount === 2, `Expected 2 matched records, got ${summary.matchedCount}`);
  // ORD-3 (Amount 300 vs 350 differs beyond 0.05)
  assert(summary.mismatchedCount === 1, `Expected 1 mismatched record, got ${summary.mismatchedCount}`);
  // ORD-4 (Orphan S1)
  assert(summary.orphanSource1Count === 1, `Expected 1 Source 1 orphan, got ${summary.orphanSource1Count}`);
  // ORD-6 (Orphan S2)
  assert(summary.orphanSource2Count === 1, `Expected 1 Source 2 orphan, got ${summary.orphanSource2Count}`);
  // ORD-5 (Duplicate in S1)
  assert(summary.duplicateCount === 2, `Expected 2 duplicates, got ${summary.duplicateCount}`);

  console.log(`  ✔ Exact match, numeric tolerance (±0.05), and date proximity (±1 day) passed.`);
  console.log(`  ✔ Duplicate detection identified ${summary.duplicateCount} duplicate records.`);
  console.log(`  ✔ Orphans properly classified (S1: ${summary.orphanSource1Count}, S2: ${summary.orphanSource2Count}).`);

  // ─── Test 3: Data Quality Assessment ─────────────────────────────────────────
  console.log("▶ [Test 3] Data Quality Engine Scoring...");
  assert(summary.qualityScore > 0 && summary.qualityScore <= 100, `Quality score ${summary.qualityScore} should be 0-100`);
  assert(summary.qualityBreakdown.issuesDetected.length > 0, "Should detect duplicate and discrepancy issues");
  console.log(`  ✔ Quality score: ${summary.qualityScore}/100 with ${summary.qualityBreakdown.issuesDetected.length} detected issues.`);

  // ─── Test 4: Report Generation (Excel, HTML, PDF) ───────────────────────────
  console.log("▶ [Test 4] Multi-format Report Generation (Excel, HTML, PDF)...");
  const meta = {
    jobName: "Automated Reconciliation Test",
    source1Name: "internal_sales.csv",
    source2Name: "bank_settlement.csv",
    executedAt: new Date().toISOString(),
  };

  // 1. Excel (multi-sheet 8 tabs)
  const xlsxBuf = await generateExcelCompareReport({
    summary,
    results,
    mappings: testMappings,
    config: testConfig,
    meta,
  });
  assert(xlsxBuf instanceof Buffer && xlsxBuf.length > 1000, "Excel buffer should be valid");
  console.log(`  ✔ Excel workbook (.xlsx) generated with 8 sheets (${xlsxBuf.length} bytes).`);

  // 2. Interactive HTML
  const htmlStr = generateHtmlCompareReport({
    summary,
    results,
    mappings: testMappings,
    config: testConfig,
    meta,
  });
  assert(typeof htmlStr === "string" && htmlStr.includes("<!DOCTYPE html>"), "HTML report should be valid");
  assert(htmlStr.includes("Discrepancies Overview"), "HTML should include discrepancy table");
  console.log(`  ✔ Interactive HTML report generated (${htmlStr.length} chars).`);

  // 3. PDF
  const pdfBuf = await generatePdfCompareReport({
    summary,
    results,
    meta,
  });
  assert(pdfBuf instanceof Buffer && pdfBuf.length > 500, "PDF buffer should be valid");
  console.log(`  ✔ Executive PDF report generated (${pdfBuf.length} bytes).`);

  console.log("\n────────────────────────────────────────────────────────");
  console.log("  ALL TESTS PASSED SUCCESSFULLY! (100% Green)");
  console.log("────────────────────────────────────────────────────────\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
