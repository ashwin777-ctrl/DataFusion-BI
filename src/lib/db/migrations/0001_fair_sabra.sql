CREATE TABLE "comparison_column_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"source1_column" text NOT NULL,
	"source2_column" text NOT NULL,
	"detected_similarity" double precision DEFAULT 0 NOT NULL,
	"mapping_method" text DEFAULT 'exact' NOT NULL,
	"is_key" boolean DEFAULT false NOT NULL,
	"manually_confirmed" boolean DEFAULT false NOT NULL,
	"ignored" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comparison_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid,
	"name" text DEFAULT 'Dataset Comparison' NOT NULL,
	"source1_metadata" jsonb,
	"source2_metadata" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"matching_configuration" jsonb,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comparison_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"record_key" text,
	"status" text NOT NULL,
	"source1_record" jsonb,
	"source2_record" jsonb,
	"differences_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comparison_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"cron_expression" text DEFAULT '0 0 * * *' NOT NULL,
	"config" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comparison_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"source_index" integer NOT NULL,
	"source_type" text DEFAULT 'FILE' NOT NULL,
	"source_role" text DEFAULT 'PRIMARY' NOT NULL,
	"original_filename" text NOT NULL,
	"format" text NOT NULL,
	"storage_key" text NOT NULL,
	"row_count" bigint,
	"column_count" integer,
	"schema_json" jsonb,
	"profile_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comparison_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"total_source1" bigint DEFAULT 0 NOT NULL,
	"total_source2" bigint DEFAULT 0 NOT NULL,
	"matched_count" bigint DEFAULT 0 NOT NULL,
	"mismatched_count" bigint DEFAULT 0 NOT NULL,
	"orphan_source1_count" bigint DEFAULT 0 NOT NULL,
	"orphan_source2_count" bigint DEFAULT 0 NOT NULL,
	"duplicate_count" bigint DEFAULT 0 NOT NULL,
	"match_rate" double precision DEFAULT 0 NOT NULL,
	"quality_score" double precision DEFAULT 100 NOT NULL,
	"details_json" jsonb,
	CONSTRAINT "comparison_summaries_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "staging_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"source_id" uuid,
	"table_name" text NOT NULL,
	"schema_definition" jsonb,
	"row_count" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "comparison_column_mappings" ADD CONSTRAINT "comparison_column_mappings_job_id_comparison_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."comparison_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_column_mappings" ADD CONSTRAINT "comparison_column_mappings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_jobs" ADD CONSTRAINT "comparison_jobs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_jobs" ADD CONSTRAINT "comparison_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_results" ADD CONSTRAINT "comparison_results_job_id_comparison_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."comparison_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_results" ADD CONSTRAINT "comparison_results_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_schedules" ADD CONSTRAINT "comparison_schedules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_sources" ADD CONSTRAINT "comparison_sources_job_id_comparison_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."comparison_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_sources" ADD CONSTRAINT "comparison_sources_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_summaries" ADD CONSTRAINT "comparison_summaries_job_id_comparison_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."comparison_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_summaries" ADD CONSTRAINT "comparison_summaries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staging_tables" ADD CONSTRAINT "staging_tables_job_id_comparison_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."comparison_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staging_tables" ADD CONSTRAINT "staging_tables_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staging_tables" ADD CONSTRAINT "staging_tables_source_id_comparison_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."comparison_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comparison_mappings_job_idx" ON "comparison_column_mappings" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "comparison_jobs_org_idx" ON "comparison_jobs" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "comparison_results_job_status_idx" ON "comparison_results" USING btree ("job_id","status");--> statement-breakpoint
CREATE INDEX "comparison_results_org_idx" ON "comparison_results" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "comparison_schedules_org_idx" ON "comparison_schedules" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "comparison_sources_job_idx" ON "comparison_sources" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "comparison_sources_org_idx" ON "comparison_sources" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "comparison_summaries_job_uq" ON "comparison_summaries" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "comparison_summaries_org_idx" ON "comparison_summaries" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "staging_tables_job_idx" ON "staging_tables" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "staging_tables_org_idx" ON "staging_tables" USING btree ("org_id");