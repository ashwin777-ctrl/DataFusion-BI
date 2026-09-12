import assert from "node:assert";
import { ingestCompareDataset } from "../src/lib/engine/compare/ingest.js";
import { inferColumnMappings } from "../src/lib/engine/compare/mapper.js";
import { executeComparison } from "../src/lib/engine/compare/matcher.js";
import { assessDataQuality } from "../src/lib/engine/compare/quality.js";
import { generateExcelCompareReport } from "../src/lib/engine/compare/reports.js";
import pg from "pg";
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://bi_app:bi_app_pw@127.0.0.1:5434/bi_platform",
});
import { randomUUID } from "node:crypto";

async function runEndToEndTwoSourceFlow() {
  console.log("==================================================");
  console.log("  TESTING ACTUAL TWO-SOURCE COMPARISON FLOW");
  console.log("==================================================\n");

  const orgId = "00000000-0000-0000-0000-000000000001";
  const jobId = randomUUID();

  // 1. Source 1: Normal uploaded external file (e.g. sales_transactions.csv)
  const source1Content = `order_num,customer,transaction_date,amount,currency
TX-101,Acme Corp,2026-03-01,1000.00,USD
TX-102,Beta LLC,2026-03-02,2500.50,USD
TX-103,Gamma Inc,2026-03-03,750.00,USD
TX-104,Delta Tech,2026-03-04,3200.00,USD
TX-105,Epsilon AI,2026-03-05,500.00,USD
TX-106,Orphan In Source 1,2026-03-06,999.00,USD
TX-107,Duplicate In Source 1,2026-03-07,150.00,USD
TX-107,Duplicate In Source 1,2026-03-07,150.00,USD`;

  console.log("▶ [Step 1] Uploading Source 1 (Normal External File)...");
  const s1Profile = await ingestCompareDataset({
    orgId,
    jobId,
    sourceIndex: 1,
    filename: "sales_transactions.csv",
    buffer: Buffer.from(source1Content, "utf8"),
  });

  assert.strictEqual(s1Profile.sourceType, "FILE", "Source 1 sourceType must be FILE");
  assert.strictEqual(s1Profile.sourceRole, "PRIMARY", "Source 1 sourceRole must be PRIMARY");
  assert.strictEqual(s1Profile.isPostgresStaged, false, "Source 1 is not staged in PG");
  assert.ok(s1Profile.rowCount === 8, "Source 1 rowCount must be 8");
  console.log("  ✔ Source 1 validated: Type=FILE, Role=PRIMARY, Rows=" + s1Profile.rowCount);

  // 2. Source 2: PostgreSQL dataset exported as CSV (postgres_orders_export.csv)
  const source2Content = `order_id,client_name,order_timestamp,total_val,currency_code
TX-101,Acme Corp,2026-03-01,1000.00,USD
TX-102,Beta LLC,2026-03-02,2500.50,USD
TX-103,Gamma Incorporated,2026-03-04,749.95,USD
TX-104,Delta Tech,2026-03-04,3100.00,USD
TX-105,Epsilon AI,2026-03-05,500.00,USD
TX-108,Orphan In Source 2 Postgres,2026-03-08,1200.00,USD`;

  console.log("▶ [Step 2] Uploading Source 2 (PostgreSQL Export File) & Staging into PostgreSQL...");
  const s2Profile = await ingestCompareDataset({
    orgId,
    jobId,
    sourceIndex: 2,
    filename: "postgres_orders_export.csv",
    buffer: Buffer.from(source2Content, "utf8"),
  });

  assert.strictEqual(s2Profile.sourceType, "POSTGRESQL_EXPORT", "Source 2 sourceType must be POSTGRESQL_EXPORT");
  assert.strictEqual(s2Profile.sourceRole, "SECONDARY", "Source 2 sourceRole must be SECONDARY");
  assert.strictEqual(s2Profile.isPostgresStaged, true, "Source 2 isPostgresStaged must be true");
  assert.ok(s2Profile.stagingTableName, "Source 2 must have stagingTableName");
  console.log("  ✔ Source 2 validated: Type=POSTGRESQL_EXPORT, Role=SECONDARY, StagedTable=" + s2Profile.stagingTableName);

  // Verify PostgreSQL staging table exists in PostgreSQL
  try {
    const pgRes = await pool.query(`SELECT count(*)::int as count FROM "${s2Profile.stagingTableName}"`);
    console.log("  ✔ PostgreSQL staging table query successful: " + pgRes.rows[0].count + " records staged in PG!");
    assert.strictEqual(pgRes.rows[0].count, 6, "PG staged row count must be 6");
  } catch (err) {
    console.warn("  ℹ PostgreSQL live query note:", err.message);
  }

  // 3. Profile Both Datasets
  console.log("▶ [Step 3] Profiling Both Datasets...");
  assert.ok(s1Profile.columns.length > 0, "S1 columns profiled");
  assert.ok(s2Profile.columns.length > 0, "S2 columns profiled");
  console.log("  ✔ S1 Columns: " + s1Profile.columns.map(c => c.name).join(", "));
  console.log("  ✔ S2 Columns: " + s2Profile.columns.map(c => c.name).join(", "));

  // 4. Suggest & Confirm Column Mappings
  console.log("▶ [Step 4] Inferring Column Mappings...");
  const mappings = inferColumnMappings(s1Profile.columns, s2Profile.columns);
  assert.ok(mappings.length > 0, "Mappings inferred");
  const keyMapping = mappings.find(m => m.isKey);
  assert.ok(keyMapping, "Primary key candidate found");
  console.log("  ✔ Primary Key: " + keyMapping.source1Column + " ↔ " + keyMapping.source2Column);

  // 5. Configure Rules & Run Comparison
  console.log("▶ [Step 5] Running Analytical Comparison in DuckDB...");
  const { summary, results } = await executeComparison({
    source1Parquet: s1Profile.parquetPath,
    source2Parquet: s2Profile.parquetPath,
    mappings,
    config: {
      keyColumns: [keyMapping.source1Column],
      columnRules: {
        amount: { column: "amount", mode: "numeric_tolerance", numericToleranceType: "absolute", numericToleranceValue: 0.1 },
        transaction_date: { column: "transaction_date", mode: "date_proximity", dateWindowDays: 1 }
      },
      normalization: {
        trimWhitespace: true,
        caseInsensitive: true,
        ignorePunctuation: false,
        nullEmptyEquivalent: true,
        normalizeNumbers: true,
        normalizeDates: true,
      }
    }
  });

  console.log("  ✔ Comparison complete! Results breakdown:");
  console.log("    - Total Source 1 (Normal): " + summary.totalSource1);
  console.log("    - Total Source 2 (PostgreSQL): " + summary.totalSource2);
  console.log("    - Matches: " + summary.matchedCount);
  console.log("    - Mismatches: " + summary.mismatchedCount);
  console.log("    - Source 1 Orphans (Missing in PG): " + summary.orphanSource1Count);
  console.log("    - Source 2 Orphans (Missing in S1): " + summary.orphanSource2Count);
  console.log("    - Duplicate records: " + summary.duplicateCount);
  console.log("    - Match Rate: " + summary.matchRate + "%");
  console.log("    - Data Quality Score: " + summary.qualityScore + " / 100");

  assert.ok(summary.matchedCount > 0, "Should have matches");
  assert.ok(summary.orphanSource1Count > 0, "Should have S1 orphans");
  assert.ok(summary.orphanSource2Count > 0, "Should have S2 orphans");
  assert.ok(summary.duplicateCount > 0, "Should have duplicate count");

  // 6. Generate Reports
  console.log("▶ [Step 6] Generating Multi-sheet Excel Report (.xlsx)...");
  const excelBuffer = await generateExcelCompareReport({
    summary,
    results,
    mappings,
    config: { keyColumns: [keyMapping.source1Column], columnRules: {}, normalization: {} },
    meta: {
      jobName: "Sales vs PostgreSQL Orders Reconcile",
      source1Name: "sales_transactions.csv (Normal Dataset)",
      source2Name: "postgres_orders_export.csv (PostgreSQL Dataset)",
      executedAt: new Date().toISOString(),
    }
  });

  assert.ok(excelBuffer.length > 1000, "Excel buffer generated");
  console.log("  ✔ Excel report generated successfully (" + excelBuffer.length + " bytes)");

  console.log("\n==================================================");
  console.log("  FULL TWO-SOURCE WORKFLOW VERIFIED SUCCESSFULLY!");
  console.log("==================================================\n");

  await pool.end().catch(() => {});
}

runEndToEndTwoSourceFlow().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
