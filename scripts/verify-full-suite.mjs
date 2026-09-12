/**
 * Full Suite Verification:
 * 1. PostgreSQL Connection with real cluster (127.0.0.1:5434)
 * 2. Invalid Credentials error verification
 * 3. Invalid Host error verification
 * 4. Two-Source Comparison Workflow (Source 1 File vs Source 2 PostgreSQL Staging Table)
 */
import { testPostgresConnection, listPostgresTables, parsePgConnectionString } from "../src/lib/engine/ingest-postgres.ts";
import { ingestCompareDataset } from "../src/lib/engine/compare/ingest.ts";
import { inferColumnMappings } from "../src/lib/engine/compare/mapper.ts";
import { executeComparison } from "../src/lib/engine/compare/matcher.ts";
import { assessDataQuality } from "../src/lib/engine/compare/quality.ts";
import { generateExcelCompareReport, generateHtmlCompareReport } from "../src/lib/engine/compare/reports.ts";
import pg from "pg";

console.log("==================================================");
console.log("RUNNING REAL AUDIT & VERIFICATION SUITE");
console.log("==================================================");

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✓ PASS: ${msg}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log("\n[TEST 1] PostgreSQL Connection - Valid Local Dev Cluster (127.0.0.1:5434)...");
  try {
    const validRes = await testPostgresConnection({
      host: "127.0.0.1",
      port: 5434,
      database: "bi_platform",
      user: "bi_app",
      password: "bi_app_pw",
      ssl: false,
    });
    assert(validRes.ok === true, `Connection succeeded (version: ${validRes.version}, latency: ${validRes.latencyMs}ms)`);
    assert(!validRes.error, "No error message returned for valid connection");

    const tables = await listPostgresTables({
      host: "127.0.0.1",
      port: 5434,
      database: "bi_platform",
      user: "bi_app",
      password: "bi_app_pw",
      ssl: false,
    });
    assert(Array.isArray(tables), `Tables fetched successfully: ${tables.length} tables found`);
  } catch (err) {
    console.error("Test 1 Exception:", err);
    testsFailed++;
  }

  console.log("\n[TEST 2] PostgreSQL Connection - Connection String URI format...");
  try {
    const uriRes = await testPostgresConnection({
      host: "postgres://bi_app:bi_app_pw@127.0.0.1:5434/bi_platform",
      port: 5432,
      database: "postgres",
      user: "postgres",
    });
    assert(uriRes.ok === true, `URI Connection succeeded (version: ${uriRes.version})`);
  } catch (err) {
    console.error("Test 2 Exception:", err);
    testsFailed++;
  }

  console.log("\n[TEST 3] PostgreSQL Connection - Invalid Credentials (Bad Password)...");
  try {
    const badPwRes = await testPostgresConnection({
      host: "127.0.0.1",
      port: 5434,
      database: "bi_platform",
      user: "bi_app",
      password: "completely_wrong_password_999",
      ssl: false,
    });
    assert(badPwRes.ok === false, "Bad password was correctly rejected");
    assert(
      badPwRes.error && badPwRes.error.toLowerCase().includes("password authentication failed"),
      `Accurate auth failure message returned: "${badPwRes.error}"`
    );
    assert(
      !badPwRes.error?.toLowerCase().includes("host address"),
      "Error does NOT produce generic host-address error"
    );
  } catch (err) {
    console.error("Test 3 Exception:", err);
    testsFailed++;
  }

  console.log("\n[TEST 4] PostgreSQL Connection - Invalid Host...");
  try {
    const badHostRes = await testPostgresConnection({
      host: "nonexistent-fake-db-host-99999.test",
      port: 5432,
      database: "postgres",
      user: "postgres",
      password: "",
      ssl: false,
    });
    assert(badHostRes.ok === false, "Bad host was correctly rejected");
    assert(
      badHostRes.error && (badHostRes.error.includes("ENOTFOUND") || badHostRes.error.includes("getaddrinfo")),
      `Accurate network failure message returned: "${badHostRes.error}"`
    );
    assert(
      !badHostRes.error?.toLowerCase().includes("provide the database host address"),
      "Error does NOT produce generic host-address error when host is provided"
    );
  } catch (err) {
    console.error("Test 4 Exception:", err);
    testsFailed++;
  }

  console.log("\n[TEST 5] Data Compare - Two Source Ingestion & PostgreSQL Staging...");
  try {
    const orgId = "00000000-0000-0000-0000-000000000001";
    const jobId = "job_audit_test_" + Date.now();

    // Source 1: Normal dataset (e.g. ERP orders)
    const s1Csv = `order_id,customer_name,order_date,amount,status
ORD-101,Acme Corp,2026-01-15,1500.50,completed
ORD-102,Beta LLC,2026-01-18,2400.00,completed
ORD-103,Gamma Inc,2026-01-20,750.25,pending
ORD-104,Delta Co,2026-01-22,3200.00,completed
ORD-105,Orphan S1,2026-01-25,999.00,completed`;

    const profile1 = await ingestCompareDataset({
      orgId,
      jobId,
      sourceIndex: 1,
      filename: "erp_source1_dataset.csv",
      buffer: Buffer.from(s1Csv, "utf8"),
    });

    assert(profile1.rowCount === 5, `Source 1 profiled: 5 rows, format=${profile1.format}`);

    // Source 2: PostgreSQL dataset export (exported from PostgreSQL and staged into PostgreSQL)
    const s2Csv = `order_id,customer_name,order_date,amount,status
ORD-101,Acme Corp,2026-01-15,1500.50,completed
ORD-102,Beta LLC,2026-01-18,2450.00,completed
ORD-103,Gamma Inc,2026-01-20,750.25,pending
ORD-104,Delta Co,2026-01-22,3200.00,completed
ORD-106,PostgreSQL Only Record,2026-01-28,888.00,completed`;

    const profile2 = await ingestCompareDataset({
      orgId,
      jobId,
      sourceIndex: 2,
      filename: "postgres_export_dataset.csv",
      buffer: Buffer.from(s2Csv, "utf8"),
    });

    assert(profile2.rowCount === 5, `Source 2 profiled: 5 rows, format=${profile2.format}`);
    assert(Boolean(profile2.stagingTableName), `Source 2 staged into PostgreSQL table: ${profile2.stagingTableName}`);

    // Verify PostgreSQL staging table exists in local cluster
    const client = new pg.Client({
      connectionString: "postgres://bi_app:bi_app_pw@127.0.0.1:5434/bi_platform",
    });
    await client.connect();
    const stagingRes = await client.query(`SELECT COUNT(*) as count FROM "${profile2.stagingTableName}";`);
    const stagedCount = Number(stagingRes.rows[0].count);
    assert(stagedCount === 5, `PostgreSQL staging table actually contains ${stagedCount} rows in local cluster`);
    await client.end();

    console.log("\n[TEST 6] Data Compare - Column Mapping & Reconciliation...");
    const mappingSuggestions = inferColumnMappings(profile1.columns, profile2.columns);
    assert(mappingSuggestions.length >= 4, `Generated ${mappingSuggestions.length} column mappings`);

    const compareRes = await executeComparison({
      source1Parquet: profile1.parquetPath,
      source2Parquet: profile2.parquetPath,
      mappings: mappingSuggestions,
      config: {
        keyColumns: ["order_id"],
        columnRules: {
          amount: { column: "amount", mode: "numeric_tolerance", tolerance: 100, toleranceType: "absolute" },
        },
        normalization: {
          trimWhitespace: true,
          caseInsensitive: true,
          ignorePunctuation: false,
          nullEmptyEquivalent: true,
          normalizeNumbers: true,
          normalizeDates: true,
        },
      },
    });

    assert(compareRes.summary.totalSource1 === 5, `Total Source 1 records reconciled: ${compareRes.summary.totalSource1}`);
    assert(compareRes.summary.matchedCount === 3, `Matched records: ${compareRes.summary.matchedCount}`);
    assert(compareRes.summary.mismatchedCount === 1, `Mismatched records: ${compareRes.summary.mismatchedCount}`);
    assert(compareRes.summary.orphanSource1Count === 1, `Orphan Source 1: ${compareRes.summary.orphanSource1Count} (ORD-105)`);
    assert(compareRes.summary.orphanSource2Count === 1, `Orphan Source 2: ${compareRes.summary.orphanSource2Count} (ORD-106)`);

    console.log("\n[TEST 7] Data Compare - Report Exports (Excel, HTML)...");
    const reportMeta = {
      jobName: "Audit Test Comparison",
      source1Name: "erp_source1_dataset.csv",
      source2Name: "postgres_export_dataset.csv",
      executedAt: new Date().toISOString(),
    };

    const excelBuf = await generateExcelCompareReport({
      summary: compareRes.summary,
      results: compareRes.results,
      mappings: mappingSuggestions,
      config: {
        keyColumns: ["order_id"],
        columnRules: {},
        normalization: {
          trimWhitespace: true,
          caseInsensitive: true,
          ignorePunctuation: false,
          nullEmptyEquivalent: true,
          normalizeNumbers: true,
          normalizeDates: true,
        },
      },
      meta: reportMeta,
    });

    assert(Boolean(excelBuf && excelBuf.length > 0), `Excel report generated (${excelBuf.length} bytes)`);

    const htmlContent = generateHtmlCompareReport({
      summary: compareRes.summary,
      results: compareRes.results,
      mappings: mappingSuggestions,
      config: {
        keyColumns: ["order_id"],
        columnRules: {},
        normalization: {
          trimWhitespace: true,
          caseInsensitive: true,
          ignorePunctuation: false,
          nullEmptyEquivalent: true,
          normalizeNumbers: true,
          normalizeDates: true,
        },
      },
      meta: reportMeta,
    });

    assert(Boolean(htmlContent && htmlContent.includes("DataFusion Compare")), "HTML report generated");

  } catch (err) {
    console.error("Test 5/6/7 Exception:", err);
    testsFailed++;
  }

  console.log("\n==================================================");
  console.log(`AUDIT & VERIFICATION RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("==================================================");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests();
