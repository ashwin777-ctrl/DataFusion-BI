import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  bigint,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Application metadata schema (PRD §7). This database holds configuration and
 * metadata ONLY — never user row data. User data lives in Parquet/DuckDB on the
 * storage volume. Every table carrying `orgId` is protected by RLS (see rls.sql).
 */

// ─── Enums ────────────────────────────────────────────────────────────────────
export const memberRole = pgEnum("member_role", [
  "owner",
  "admin",
  "analyst",
  "viewer",
]);
export const sourceKind = pgEnum("source_kind", ["excel_sheet", "pg_table"]);
export const fileKind = pgEnum("file_kind", ["xlsx", "xls", "csv", "tsv"]);
export const datasetStatus = pgEnum("dataset_status", [
  "draft",
  "building",
  "ready",
  "failed",
]);
export const dsSourceRole = pgEnum("ds_source_role", ["fact", "dimension"]);
export const joinType = pgEnum("join_type", [
  "inner",
  "left",
  "right",
  "full",
  "union",
]);
export const cardinality = pgEnum("cardinality", ["1:1", "1:N", "N:1", "N:M"]);
export const relOrigin = pgEnum("rel_origin", [
  "inferred",
  "foreign_key",
  "manual",
]);
export const exportFormat = pgEnum("export_format", ["pdf", "xlsx", "csv"]);
export const sslMode = pgEnum("ssl_mode", [
  "disable",
  "require",
  "verify-ca",
  "verify-full",
]);

// Common column helpers.
const id = () =>
  uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`);
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// ─── Organizations & identity ───────────────────────────────────────────────
export const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  quotaStorageBytes: bigint("quota_storage_bytes", { mode: "number" })
    .notNull()
    .default(5 * 1024 * 1024 * 1024),
  quotaDatasets: integer("quota_datasets").notNull().default(50),
  quotaRowsPerDataset: bigint("quota_rows_per_dataset", { mode: "number" })
    .notNull()
    .default(1_000_000),
  createdAt: createdAt(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(), // normalized lowercase
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: createdAt(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull().default("analyst"),
    createdAt: createdAt(),
  },
  (t) => ({
    userOrg: uniqueIndex("memberships_user_org_uq").on(t.userId, t.orgId),
    byOrg: index("memberships_org_idx").on(t.orgId),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activeOrgId: uuid("active_org_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    tokenHash: text("token_hash").notNull().unique(), // sha256 of opaque token
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => ({
    byUser: index("sessions_user_idx").on(t.userId),
  }),
);

export const invitations = pgTable(
  "invitations",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: memberRole("role").notNull().default("analyst"),
    tokenHash: text("token_hash").notNull().unique(),
    invitedBy: uuid("invited_by").references(() => users.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => ({
    byOrg: index("invitations_org_idx").on(t.orgId),
  }),
);

// ─── Postgres connections (encrypted; PRD FR-9.2) ────────────────────────────
export const pgConnections = pgTable(
  "pg_connections",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    host: text("host").notNull(),
    port: integer("port").notNull().default(5432),
    database: text("database").notNull(),
    username: text("username").notNull(),
    // AES-256-GCM ciphertext + nonce; decrypted only in the worker (never returned).
    passwordCiphertext: text("password_ciphertext").notNull(),
    passwordNonce: text("password_nonce").notNull(),
    sslMode: sslMode("ssl_mode").notNull().default("verify-full"),
    caCertCiphertext: text("ca_cert_ciphertext"),
    caCertNonce: text("ca_cert_nonce"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
    lastTestStatus: text("last_test_status"),
    lastTestError: text("last_test_error"),
    createdAt: createdAt(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    byOrg: index("pg_connections_org_idx").on(t.orgId),
  }),
);

// ─── Source files & sources ──────────────────────────────────────────────────
export const sourceFiles = pgTable(
  "source_files",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    originalName: text("original_name").notNull(),
    storagePath: text("storage_path").notNull(), // derived server-side; never user input
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    sha256: text("sha256").notNull(),
    detectedKind: fileKind("detected_kind").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("uploaded"),
    createdAt: createdAt(),
  },
  (t) => ({
    byOrg: index("source_files_org_idx").on(t.orgId),
  }),
);

export const sources = pgTable(
  "sources",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    kind: sourceKind("kind").notNull(),
    alias: text("alias").notNull(),
    // excel_sheet
    sourceFileId: uuid("source_file_id").references(() => sourceFiles.id, {
      onDelete: "cascade",
    }),
    sheetName: text("sheet_name"),
    headerRowIndex: integer("header_row_index").notNull().default(0),
    skipRows: integer("skip_rows").notNull().default(0),
    // pg_table
    pgConnectionId: uuid("pg_connection_id").references(() => pgConnections.id, {
      onDelete: "set null",
    }),
    schemaName: text("schema_name"),
    tableName: text("table_name"),
    selectedColumns: jsonb("selected_columns"),
    // common
    rowCount: bigint("row_count", { mode: "number" }),
    parquetPath: text("parquet_path"),
    parquetBytes: bigint("parquet_bytes", { mode: "number" }),
    profiledAt: timestamp("profiled_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => ({
    byOrg: index("sources_org_idx").on(t.orgId),
    byFile: index("sources_file_idx").on(t.sourceFileId),
  }),
);

export const columnProfiles = pgTable(
  "column_profiles",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    rawName: text("raw_name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    storageType: text("storage_type").notNull(), // duckdb logical type
    semanticRole: text("semantic_role").notNull(), // date|measure|dimension|identifier|geo|boolean|text
    semanticSubtype: text("semantic_subtype"), // currency|percent|count|country|...
    confidence: doublePrecision("confidence").notNull().default(0),
    nullCount: bigint("null_count", { mode: "number" }),
    distinctCount: bigint("distinct_count", { mode: "number" }),
    cardinalityRatio: doublePrecision("cardinality_ratio"),
    minValue: text("min_value"),
    maxValue: text("max_value"),
    stats: jsonb("stats"), // quantiles, mean, stddev, top values, etc.
    sampleValues: jsonb("sample_values"),
    userOverride: jsonb("user_override"), // role/subtype/format/date pattern
    createdAt: createdAt(),
  },
  (t) => ({
    bySource: index("column_profiles_source_idx").on(t.sourceId),
    sourceOrdinal: uniqueIndex("column_profiles_source_ordinal_uq").on(
      t.sourceId,
      t.ordinal,
    ),
  }),
);

// ─── Datasets & consolidation ──────────────────────────────────────────────────
export const datasets = pgTable(
  "datasets",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: datasetStatus("status").notNull().default("draft"),
    factSourceId: uuid("fact_source_id"),
    duckdbPath: text("duckdb_path"),
    storageBytes: bigint("storage_bytes", { mode: "number" }).default(0),
    rowCount: bigint("row_count", { mode: "number" }),
    dataVersion: integer("data_version").notNull().default(0),
    lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }),
    buildError: text("build_error"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    byOrg: index("datasets_org_idx").on(t.orgId),
  }),
);

export const datasetSources = pgTable(
  "dataset_sources",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    role: dsSourceRole("role").notNull().default("dimension"),
  },
  (t) => ({
    byDataset: index("dataset_sources_dataset_idx").on(t.datasetId),
    datasetSource: uniqueIndex("dataset_sources_ds_src_uq").on(
      t.datasetId,
      t.sourceId,
    ),
  }),
);

export const relationships = pgTable(
  "relationships",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    leftSourceId: uuid("left_source_id").notNull(),
    leftColumns: jsonb("left_columns").notNull(), // string[]
    rightSourceId: uuid("right_source_id").notNull(),
    rightColumns: jsonb("right_columns").notNull(), // string[]
    joinType: joinType("join_type").notNull().default("left"),
    cardinality: cardinality("cardinality"),
    overlapRatio: doublePrecision("overlap_ratio"),
    nameSimilarity: doublePrecision("name_similarity"),
    confidence: doublePrecision("confidence").notNull().default(0),
    origin: relOrigin("origin").notNull().default("inferred"),
    inflationFactor: doublePrecision("inflation_factor"),
    isEnabled: boolean("is_enabled").notNull().default(true),
    userConfirmedAt: timestamp("user_confirmed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => ({
    byDataset: index("relationships_dataset_idx").on(t.datasetId),
  }),
);

export const transformSteps = pgTable(
  "transform_steps",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    kind: text("kind").notNull(),
    config: jsonb("config").notNull(),
    isEnabled: boolean("is_enabled").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => ({
    byDataset: index("transform_steps_dataset_idx").on(t.datasetId),
    datasetOrdinal: uniqueIndex("transform_steps_dataset_ordinal_uq").on(
      t.datasetId,
      t.ordinal,
    ),
  }),
);

export const semanticModels = pgTable(
  "semantic_models",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    dataVersion: integer("data_version").notNull(),
    dimensions: jsonb("dimensions").notNull(),
    measures: jsonb("measures").notNull(),
    dateColumns: jsonb("date_columns").notNull(),
    availableGrains: jsonb("available_grains").notNull(),
    hierarchies: jsonb("hierarchies").notNull(),
    kpiBindings: jsonb("kpi_bindings").notNull(),
    chartSuggestions: jsonb("chart_suggestions").notNull(),
    computedAt: createdAt(),
  },
  (t) => ({
    datasetVersion: uniqueIndex("semantic_models_ds_version_uq").on(
      t.datasetId,
      t.dataVersion,
    ),
  }),
);

export const qualityReports = pgTable(
  "quality_reports",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    datasetId: uuid("dataset_id").references(() => datasets.id, {
      onDelete: "cascade",
    }),
    sourceId: uuid("source_id").references(() => sources.id, {
      onDelete: "cascade",
    }),
    dataVersion: integer("data_version").notNull().default(0),
    scope: text("scope").notNull(), // source | dataset
    payload: jsonb("payload").notNull(),
    createdAt: createdAt(),
  },
  (t) => ({
    byDataset: index("quality_reports_dataset_idx").on(t.datasetId),
  }),
);

export const insights = pgTable(
  "insights",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    dataVersion: integer("data_version").notNull(),
    kind: text("kind").notNull(),
    severity: text("severity"),
    rank: doublePrecision("rank").notNull().default(0),
    payload: jsonb("payload").notNull(), // the computed facts / numbers
    method: text("method").notNull(),
    sampleSize: bigint("sample_size", { mode: "number" }),
    confidence: doublePrecision("confidence"),
    sqlFingerprint: text("sql_fingerprint"),
    userFeedback: text("user_feedback"),
    createdAt: createdAt(),
  },
  (t) => ({
    byDataset: index("insights_dataset_idx").on(t.datasetId, t.dataVersion),
  }),
);

// ─── Reports & exports ──────────────────────────────────────────────────────────
export const reports = pgTable(
  "reports",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    layout: jsonb("layout"),
    filterState: jsonb("filter_state"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: createdAt(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    byOrg: index("reports_org_idx").on(t.orgId),
  }),
);

export const reportExports = pgTable(
  "report_exports",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    format: exportFormat("format").notNull(),
    status: text("status").notNull().default("pending"),
    storagePath: text("storage_path"),
    byteSize: bigint("byte_size", { mode: "number" }),
    requestedBy: uuid("requested_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => ({
    byReport: index("report_exports_report_idx").on(t.reportId),
  }),
);

// ─── Audit log (PRD FR-1.9) ────────────────────────────────────────────────────
export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    orgId: uuid("org_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata"),
    createdAt: createdAt(),
  },
  (t) => ({
    byOrg: index("audit_log_org_idx").on(t.orgId, t.createdAt),
  }),
);

// ─── Background jobs (lightweight tracking; pg-boss owns execution in S13) ──────
export const jobs = pgTable(
  "jobs",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // ingest | profile | consolidate | analyze | export
    status: text("status").notNull().default("queued"), // queued|running|succeeded|failed
    progress: integer("progress").notNull().default(0),
    stage: text("stage"),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    error: text("error"),
    payload: jsonb("payload"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => ({
    byOrg: index("jobs_org_idx").on(t.orgId, t.createdAt),
  }),
);

// All tenant-scoped tables, for RLS application (see rls.sql / migrate.ts).
export const ORG_SCOPED_TABLES = [
  "organizations",
  "memberships",
  "invitations",
  "pg_connections",
  "source_files",
  "sources",
  "column_profiles",
  "datasets",
  "dataset_sources",
  "relationships",
  "transform_steps",
  "semantic_models",
  "quality_reports",
  "insights",
  "reports",
  "report_exports",
  "audit_log",
  "jobs",
] as const;
