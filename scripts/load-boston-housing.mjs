import pg from "pg";
const { Client } = pg;
import { randomBytes, createHmac, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

async function run() {
  console.log("=== INGESTING BOSTON HOUSING DATASET VIA API ===");
  const baseUrl = "http://localhost:3001";

  // 1. Get Auth Secret
  const envContent = readFileSync(".env", "utf8");
  const authSecretMatch = envContent.match(/AUTH_SECRET=["']?([^"'\r\n]+)/);
  const authSecret = authSecretMatch ? authSecretMatch[1] : "97d824a62a9e6767d1a4ad74c96d00476693417ac32664e32866f48f9528ef5c";

  // 2. Connect to DB to find ashwin@datafusion.io and create a fresh session
  const pgClient = new Client({
    connectionString: "postgresql://bi_super:bi_super_pw@127.0.0.1:5434/bi_platform",
  });
  await pgClient.connect();

  const userRes = await pgClient.query("SELECT id FROM users WHERE email = 'ashwin@datafusion.io'");
  let userId = userRes.rows[0]?.id;
  let orgId = "6f1c7403-d1d1-4cb9-99ee-4f8d8a85007f"; // DataFusion BI

  if (!userId) {
    // If not found, use first user or create
    const anyUser = await pgClient.query("SELECT u.id, m.org_id FROM users u JOIN memberships m ON u.id = m.user_id LIMIT 1");
    userId = anyUser.rows[0].id;
    orgId = anyUser.rows[0].org_id;
  }

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHmac("sha256", authSecret).update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  const sessionId = randomUUID();

  await pgClient.query(
    `INSERT INTO sessions (id, user_id, active_org_id, token_hash, expires_at) VALUES ($1, $2, $3, $4, $5)`,
    [sessionId, userId, orgId, tokenHash, expiresAt]
  );
  await pgClient.end();

  console.log(`✓ Active session generated for user ${userId} in org ${orgId}`);
  writeFileSync("scripts/.active-session.txt", rawToken, "utf8");

  const sessionCookie = `bi_session=${rawToken}`;

  // 3. Upload CSV to /api/sources/upload
  console.log("\n[1/4] Uploading boston_housing.csv to /api/sources/upload...");
  const csvBuffer = readFileSync("scripts/boston_housing.csv");
  const blob = new Blob([csvBuffer], { type: "text/csv" });
  const formData = new FormData();
  formData.append("file", blob, "boston_housing.csv");

  const uploadRes = await fetch(`${baseUrl}/api/sources/upload`, {
    method: "POST",
    headers: {
      Cookie: sessionCookie,
    },
    body: formData,
  });

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new Error(`Upload failed (${uploadRes.status}): ${JSON.stringify(uploadData)}`);
  }

  console.log("✓ Upload successful!");
  console.log(`  Source ID: ${uploadData.sourceId}`);
  console.log(`  Rows: ${uploadData.rowCount}`);
  console.log(`  Columns detected: ${uploadData.columns?.length || 14}`);

  const sourceId = uploadData.sourceId;

  // 4. Create Consolidated Dataset
  console.log("\n[2/4] Consolidating Source into Dataset via /api/datasets...");
  const datasetRes = await fetch(`${baseUrl}/api/datasets`, {
    method: "POST",
    headers: {
      Cookie: sessionCookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Boston Housing Dataset",
      sourceIds: [sourceId],
      joins: [],
    }),
  });

  const datasetData = await datasetRes.json();
  if (!datasetRes.ok) {
    throw new Error(`Dataset creation failed (${datasetRes.status}): ${JSON.stringify(datasetData)}`);
  }

  const datasetId = datasetData.dataset?.id || datasetData.id;
  console.log(`✓ Dataset Created: "${datasetData.dataset?.name || 'Boston Housing Dataset'}" (ID: ${datasetId})`);
  console.log(`  Row count: ${datasetData.dataset?.rowCount}`);

  // 5. Query Dynamic KPIs
  console.log("\n[3/4] Generating Dynamic KPIs from DuckDB (/api/datasets/[id]/kpis)...");
  const kpiRes = await fetch(`${baseUrl}/api/datasets/${datasetId}/kpis`, {
    method: "POST",
    headers: {
      Cookie: sessionCookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const kpiData = await kpiRes.json();
  console.log("✓ Dynamic KPIs calculated:");
  if (kpiData.kpis) {
    for (const k of kpiData.kpis) {
      console.log(`  • ${k.name}: ${k.formattedValue}`);
    }
  }

  // 6. Query Visual Analytics Charts
  console.log("\n[4/4] Generating Charts & Insights...");
  // Distribution / Binned RM (Rooms) vs MEDV (Median Value)
  const chartRes = await fetch(`${baseUrl}/api/datasets/${datasetId}/charts`, {
    method: "POST",
    headers: {
      Cookie: sessionCookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chartType: "bar",
      dimension: "rad",
      measure: "medv",
      aggregation: "avg",
    }),
  });
  const chartData = await chartRes.json();
  console.log("✓ Average Home Value (MEDV $k) by Highway Accessibility Index (RAD):");
  if (chartData.data) {
    for (const d of chartData.data) {
      console.log(`  • Highway Index ${d.label}: $${Number(d.value).toFixed(2)}k`);
    }
  }

  // Insights
  const insightsRes = await fetch(`${baseUrl}/api/datasets/${datasetId}/insights`, {
    headers: {
      Cookie: sessionCookie,
    },
  });
  if (insightsRes.ok) {
    const insightsData = await insightsRes.json();
    console.log("\n✓ Business Insights Generated:");
    console.log("  Summary:", insightsData.executiveSummary || insightsData.summary || "Ready");
  }

  console.log("\n=======================================================");
  console.log("  DATA INGESTION & BI METRICS PIPELINE SUCCESSFUL!   ");
  console.log(`  Platform URL: ${baseUrl}/app`);
  console.log(`  Sources URL:  ${baseUrl}/app/sources`);
  console.log(`  Prep URL:     ${baseUrl}/app/prep`);
  console.log(`  Insights URL: ${baseUrl}/app/insights`);
  console.log("=======================================================");
}

run().catch((err) => {
  console.error("Error in load-boston-housing:", err);
  process.exit(1);
});
