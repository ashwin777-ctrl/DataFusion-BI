import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id: jobId } = await params;

    const url = new URL(req.url);
    const filterStatus = url.searchParams.get("status") || "all";
    const search = url.searchParams.get("search")?.toLowerCase().trim();
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(10, Number(url.searchParams.get("limit") || 50)));

    const data = await withOrg(orgId, async (db) => {
      // 1. Fetch Job
      const jobRows = await db
        .select()
        .from(schema.comparisonJobs)
        .where(and(eq(schema.comparisonJobs.id, jobId), eq(schema.comparisonJobs.orgId, orgId)));
      const job = jobRows[0] || null;

      if (!job) return null;

      // 2. Fetch Summary
      const summaryRows = await db
        .select()
        .from(schema.comparisonSummaries)
        .where(eq(schema.comparisonSummaries.jobId, jobId));
      const summary = summaryRows[0] || null;

      // 3. Fetch Mappings
      const mappings = await db
        .select()
        .from(schema.comparisonColumnMappings)
        .where(eq(schema.comparisonColumnMappings.jobId, jobId));

      // 4. Fetch Results
      const resultsQuery = db
        .select()
        .from(schema.comparisonResults)
        .where(
          filterStatus && filterStatus !== "all"
            ? and(eq(schema.comparisonResults.jobId, jobId), eq(schema.comparisonResults.status, filterStatus))
            : eq(schema.comparisonResults.jobId, jobId),
        );

      const allMatchingResults = await resultsQuery;

      let filtered = allMatchingResults;
      if (search) {
        filtered = allMatchingResults.filter((r) => {
          if (r.recordKey && r.recordKey.toLowerCase().includes(search)) return true;
          const s1Str = JSON.stringify(r.source1Record || "").toLowerCase();
          const s2Str = JSON.stringify(r.source2Record || "").toLowerCase();
          return s1Str.includes(search) || s2Str.includes(search);
        });
      }

      const total = filtered.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const paginated = filtered.slice((page - 1) * limit, page * limit);

      return {
        job,
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
              ...(summary.detailsJson as any),
            }
          : null,
        mappings,
        results: paginated.map((r) => ({
          id: r.id,
          recordKey: r.recordKey || "",
          status: r.status,
          source1Record: r.source1Record,
          source2Record: r.source2Record,
          differences: r.differencesJson || [],
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    });

    if (!data) {
      return NextResponse.json({ error: "Comparison job not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load comparison job" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id: jobId } = await params;

    await withOrg(orgId, async (db) => {
      await db
        .delete(schema.comparisonJobs)
        .where(and(eq(schema.comparisonJobs.id, jobId), eq(schema.comparisonJobs.orgId, orgId)));
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete comparison job" },
      { status: 500 },
    );
  }
}
