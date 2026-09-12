import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { executeComparison } from "@/lib/engine/compare/matcher";
import { eq } from "drizzle-orm";
import type { ColumnMappingSuggestion, MatchingConfiguration } from "@/lib/engine/compare/types";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { orgId, session } = await requireOrg();
    const userId = session?.user?.id;
    const body = await req.json();

    const {
      jobId = randomUUID(),
      jobName = "Dataset Comparison",
      source1Parquet,
      source2Parquet,
      source1Name = "Source 1",
      source2Name = "Source 2",
      mappings,
      config,
    } = body as {
      jobId?: string;
      jobName?: string;
      source1Parquet: string;
      source2Parquet: string;
      source1Name?: string;
      source2Name?: string;
      mappings: ColumnMappingSuggestion[];
      config: MatchingConfiguration;
    };

    if (!source1Parquet || !source2Parquet) {
      return NextResponse.json(
        { error: "Both source1Parquet and source2Parquet file paths are required" },
        { status: 400 },
      );
    }

    if (!mappings || mappings.length === 0) {
      return NextResponse.json(
        { error: "Column mappings are required" },
        { status: 400 },
      );
    }

    // Run the analytical comparison engine
    const { summary, results } = await executeComparison({
      source1Parquet,
      source2Parquet,
      mappings,
      config,
    });

    // Persist to PostgreSQL under tenant RLS
    await withOrg(orgId, async (db) => {
      // 1. Insert or update Job
      const existingJob = await db
        .select()
        .from(schema.comparisonJobs)
        .where(eq(schema.comparisonJobs.id, jobId));

      if (existingJob.length === 0) {
        await db.insert(schema.comparisonJobs).values({
          id: jobId,
          orgId,
          userId: userId || null,
          name: jobName,
          source1Metadata: { name: source1Name, parquetPath: source1Parquet },
          source2Metadata: { name: source2Name, parquetPath: source2Parquet },
          status: "completed",
          matchingConfiguration: config,
          startedAt: new Date(Date.now() - summary.durationMs),
          completedAt: new Date(),
        });
      } else {
        await db
          .update(schema.comparisonJobs)
          .set({
            status: "completed",
            matchingConfiguration: config,
            completedAt: new Date(),
          })
          .where(eq(schema.comparisonJobs.id, jobId));

        // Clean prior run records if re-running
        await db.delete(schema.comparisonColumnMappings).where(eq(schema.comparisonColumnMappings.jobId, jobId));
        await db.delete(schema.comparisonSummaries).where(eq(schema.comparisonSummaries.jobId, jobId));
        await db.delete(schema.comparisonResults).where(eq(schema.comparisonResults.jobId, jobId));
      }

      // 2. Insert Column Mappings
      for (const m of mappings) {
        await db.insert(schema.comparisonColumnMappings).values({
          id: randomUUID(),
          jobId,
          orgId,
          source1Column: m.source1Column,
          source2Column: m.source2Column || "",
          detectedSimilarity: m.detectedSimilarity,
          mappingMethod: m.mappingMethod,
          isKey: m.isKey,
          manuallyConfirmed: m.manuallyConfirmed,
          ignored: m.ignored,
        });
      }

      // 3. Insert Summary
      await db.insert(schema.comparisonSummaries).values({
        id: randomUUID(),
        jobId,
        orgId,
        totalSource1: summary.totalSource1,
        totalSource2: summary.totalSource2,
        matchedCount: summary.matchedCount,
        mismatchedCount: summary.mismatchedCount,
        orphanSource1Count: summary.orphanSource1Count,
        orphanSource2Count: summary.orphanSource2Count,
        duplicateCount: summary.duplicateCount,
        matchRate: summary.matchRate,
        qualityScore: summary.qualityScore,
        detailsJson: {
          durationMs: summary.durationMs,
          qualityBreakdown: summary.qualityBreakdown,
          mismatchFieldFrequency: summary.mismatchFieldFrequency,
          duplicateGroups: summary.duplicateGroups,
        },
      });

      // 4. Insert batch of results (up to 2000 for fast DB retrieval)
      const toPersist = results.slice(0, 2000);
      for (let i = 0; i < toPersist.length; i += 100) {
        const chunk = toPersist.slice(i, i + 100);
        await db.insert(schema.comparisonResults).values(
          chunk.map((r) => ({
            id: r.id || randomUUID(),
            jobId,
            orgId,
            recordKey: r.recordKey,
            status: r.status,
            source1Record: r.source1Record || null,
            source2Record: r.source2Record || null,
            differencesJson: r.differences,
          })),
        );
      }
    });

    return NextResponse.json({
      success: true,
      jobId,
      summary,
      results: results.slice(0, 200), // First page
      totalResults: results.length,
    });
  } catch (err: any) {
    console.error("Comparison execution error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to execute comparison" },
      { status: 500 },
    );
  }
}
