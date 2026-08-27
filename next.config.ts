import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the file-tracing root to this project. A stray lockfile in a parent
  // directory otherwise makes Next infer the wrong workspace root, which breaks
  // standalone-output tracing for native modules (DuckDB / argon2 / sharp).
  outputFileTracingRoot: path.resolve(process.cwd()),
  reactStrictMode: true,
  poweredByHeader: false,
  // Native/heavy server-only modules must never be bundled by webpack/turbopack.
  // DuckDB and argon2 are native addons; exceljs/pg are large server-only deps.
  serverExternalPackages: [
    "@duckdb/node-api",
    "@node-rs/argon2",
    "exceljs",
    "pg",
  ],
  eslint: {
    // Type-safety is enforced via `npm run typecheck` in CI; lint runs separately.
    ignoreDuringBuilds: false,
  },
  async headers() {
    // Baseline security headers (PRD §12). CSP is added in the hardening slice
    // once the exact script/style sources are known.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
