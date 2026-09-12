import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId } = await requireOrg();

    const jobs = await withOrg(orgId, async (db) => {
      const jobRows = await db
        .select()
        .from(schema.comparisonJobs)
        .where(eq(schema.comparisonJobs.orgId, orgId))
        .orderBy(desc(schema.comparisonJobs.createdAt))
        .limit(25);

      const jobList = [];
      for (const j of jobRows) {
        const sumRows = await db
          .select()
          .from(schema.comparisonSummaries)
          .where(eq(schema.comparisonSummaries.jobId, j.id));
        const summary = sumRows[0] || null;

        jobList.push({
          id: j.id,
          name: j.name,
          status: j.status,
          source1Name: (j.source1Metadata as any)?.name || "Source 1",
          source2Name: (j.source2Metadata as any)?.name || "Source 2",
          completedAt: j.completedAt,
          createdAt: j.createdAt,
          summary: summary
            ? {
                totalSource1: summary.totalSource1,
                totalSource2: summary.totalSource2,
                matchedCount: summary.matchedCount,
                mismatchedCount: summary.mismatchedCount,
                orphanSource1Count: summary.orphanSource1Count,
                orphanSource2Count: summary.orphanSource2Count,
                duplicateCount: summary.duplicateCount,
                matchRate: summary.matchRate,
                qualityScore: summary.qualityScore,
              }
            : null,
        });
      }
      return jobList;
    });

    return NextResponse.json({ jobs });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch comparison jobs" },
      { status: 500 },
    );
  }
}
