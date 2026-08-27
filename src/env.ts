import { z } from "zod";

/**
 * Environment validation (PRD S0). Fails fast at process start with a readable
 * report rather than surfacing `undefined` deep in a request. Server-only — this
 * module must never be imported into a client component.
 */

const isProd = process.env.NODE_ENV === "production";
// `next build` runs with NODE_ENV=production but is not a running server, so the
// runtime-only guards below (e.g. https origin) must not fire during compilation.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // App Postgres (metadata only — never user row data). Two URLs so the app
  // connects as a non-superuser role that RLS applies to, while migrations may
  // use an owner role (PRD FR-1.6).
  DATABASE_URL: z
    .string()
    .url()
    .describe("App connection — non-superuser, RLS-enforced role"),
  MIGRATION_DATABASE_URL: z
    .string()
    .url()
    .optional()
    .describe("Owner role for running migrations; defaults to DATABASE_URL"),

  // Where Parquet / DuckDB / uploads live on the persistent volume (PRD §7).
  STORAGE_DIR: z.string().min(1).default("./storage"),

  // 32-byte key (base64) for AES-256-GCM credential encryption (PRD FR-9.2).
  // Interface designed so a KMS provider can replace the raw key later (OQ2).
  CREDENTIAL_ENC_KEY: z
    .string()
    .refine(
      (v) => {
        try {
          return Buffer.from(v, "base64").length === 32;
        } catch {
          return false;
        }
      },
      { message: "must be base64 for exactly 32 bytes (openssl rand -base64 32)" },
    ),

  // Session cookie signing / app secret.
  AUTH_SECRET: z.string().min(32, "must be at least 32 chars"),

  // Upload limits (PRD FR-2.2).
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(100 * 1024 * 1024),
  MAX_FILES_PER_BATCH: z.coerce.number().int().positive().default(10),

  // Public origin, used for cookie domain and absolute links.
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    // Throwing here stops boot; the message is the whole point.
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\n` +
        `See .env.example for the required variables.`,
    );
  }
  const env = parsed.data;

  // Cross-field production guards (runtime only — skipped during `next build`).
  if (isProd && !isBuildPhase) {
    if (
      env.APP_ORIGIN.startsWith("http://") &&
      !env.APP_ORIGIN.includes("localhost") &&
      !env.APP_ORIGIN.includes("127.0.0.1")
    ) {
      throw new Error("APP_ORIGIN must be https in production (secure cookies).");
    }
  }
  return {
    ...env,
    MIGRATION_DATABASE_URL: env.MIGRATION_DATABASE_URL ?? env.DATABASE_URL,
    isProd,
  };
}

export const env = load();
export type Env = typeof env;
