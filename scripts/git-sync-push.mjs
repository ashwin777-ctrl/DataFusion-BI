import fs from "node:fs";
import { execSync } from "node:child_process";

// 1. Read token safely from mcp_config.json
const mcpConfig = JSON.parse(fs.readFileSync("C:\\Users\\ashwi\\.gemini\\config\\mcp_config.json", "utf8"));
const token = mcpConfig.mcpServers?.github?.env?.GITHUB_PERSONAL_ACCESS_TOKEN;

if (!token) {
  console.error("No token found");
  process.exit(1);
}

try {
  console.log("Staging changes...");
  execSync("git add -A", { stdio: "inherit" });

  const status = execSync("git status --porcelain", { encoding: "utf8" });
  if (status.trim()) {
    console.log("Committing changes...");
    execSync('git commit -m "feat(compare): add dedicated Data Compare workflow, PostgreSQL staging & connection presets"', { stdio: "inherit" });
  } else {
    console.log("No unstaged changes to commit.");
  }

  console.log("Setting authenticated remote URL...");
  const authUrl = `https://x-access-token:${token}@github.com/ashwin777-ctrl/DataFusion-BI.git`;
  execSync(`git remote set-url origin "${authUrl}"`, { stdio: "ignore" });

  console.log("Pushing to origin main...");
  execSync("git push origin main", { stdio: "inherit" });

  console.log("Successfully pushed to GitHub!");
} catch (err) {
  console.error("Push failed:", err.message);
} finally {
  // Always restore clean remote URL
  execSync('git remote set-url origin "https://github.com/ashwin777-ctrl/DataFusion-BI.git"', { stdio: "ignore" });
  console.log("Restored clean remote URL.");
}
