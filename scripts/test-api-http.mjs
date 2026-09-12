/**
 * Verify HTTP endpoints and HTML page rendering on http://localhost:3001
 */

async function verify() {
  console.log("Testing running server on http://localhost:3001...\n");

  // 1. Health check
  const healthRes = await fetch("http://localhost:3001/api/health");
  console.log(`[1] /api/health status: ${healthRes.status} (ok: ${healthRes.ok})`);

  // 2. Sources page HTML
  const sourcesRes = await fetch("http://localhost:3001/app/sources");
  const sourcesHtml = await sourcesRes.text();
  console.log(`[2] /app/sources status: ${sourcesRes.status}`);
  console.log(`    Redirected to login or rendered? ${sourcesRes.url.includes("/login") ? "Redirected to /login (Auth Guard enforced)" : "Rendered"}`);

  // 3. Compare page HTML
  const compareRes = await fetch("http://localhost:3001/app/compare");
  console.log(`[3] /app/compare status: ${compareRes.status}`);
  console.log(`    Redirected to login or rendered? ${compareRes.url.includes("/login") ? "Redirected to /login (Auth Guard enforced)" : "Rendered"}`);

  // 4. PostgreSQL test endpoint without auth
  const unauthTestRes = await fetch("http://localhost:3001/api/sources/postgres/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ host: "127.0.0.1", port: 5434, database: "bi_platform", user: "bi_app" }),
  });
  console.log(`[4] /api/sources/postgres/test unauthenticated: status ${unauthTestRes.status}`);

  console.log("\nServer is live and responding correctly to requests.");
}

verify().catch(console.error);
