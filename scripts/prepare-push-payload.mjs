import fs from "node:fs";
import path from "node:path";

const filesToPush = [
  "vercel.json",
  "scripts/bootstrap-db.mjs",
  "src/app/(app)/app/app-header.tsx",
  "src/app/(app)/app/sources/page.tsx",
  "src/app/(app)/app/compare/page.tsx",
  "src/components/compare/compare-wizard.tsx",
  "src/app/api/compare/upload/route.ts",
  "src/app/api/compare/sample/route.ts",
  "src/app/api/compare/map/route.ts",
  "src/app/api/compare/run/route.ts",
  "src/app/api/compare/jobs/route.ts",
  "src/app/api/compare/jobs/[id]/route.ts",
  "src/app/api/compare/jobs/[id]/export/route.ts",
  "src/app/api/compare/schedules/route.ts",
  "src/app/api/sources/postgres/test/route.ts",
  "src/app/api/sources/postgres/tables/route.ts",
  "src/app/api/sources/postgres/sync/route.ts",
  "src/lib/engine/compare/types.ts",
  "src/lib/engine/compare/ingest.ts",
  "src/lib/engine/compare/mapper.ts",
  "src/lib/engine/compare/matcher.ts",
  "src/lib/engine/compare/profiler.ts",
  "src/lib/engine/compare/quality.ts",
  "src/lib/engine/compare/reports.ts",
  "src/lib/engine/ingest-postgres.ts",
  "src/lib/db/schema.ts",
  "src/lib/db/migrations/0001_fair_sabra.sql",
  "src/lib/db/migrations/meta/_journal.json",
  "src/lib/db/migrations/meta/0001_snapshot.json",
];

const payload = [];
for (const relPath of filesToPush) {
  const fullPath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) {
    console.error("Missing file:", fullPath);
    process.exit(1);
  }
  const content = fs.readFileSync(fullPath, "utf8");
  payload.push({
    path: relPath.replace(/\\/g, "/"),
    content,
  });
}

console.log(`Prepared ${payload.length} files for GitHub commit.`);
fs.writeFileSync(".scratch/push-payload.json", JSON.stringify(payload));
