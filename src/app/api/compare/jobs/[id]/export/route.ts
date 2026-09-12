import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import {
  generateExcelCompareReport,
  generateHtmlCompareReport,
  generatePdfCompareReport,
  type ReportMetadata,
} from "@/lib/engine/compare/reports";
import type { ComparisonSummaryStats, ComparisonRecordResult, ColumnMappingSuggestion, MatchingConfiguration } from "@/lib/engine/compare/types";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id: jobId } = await params;

    const url = new URL(req.url);
    const format = (url.searchParams.get("format") || "xlsx").toLowerCase();

    const data = await withOrg(orgId, async (db) => {
      const jobRows = await db
        .select()
        .from(schema.comparisonJobs)
        .where(and(eq(schema.comparisonJobs.id, jobId), eq(schema.comparisonJobs.orgId, orgId)));
      const job = jobRows[0] || null;
      if (!job) return null;

      const summaryRows = await db
        .select()
        .from(schema.comparisonSummaries)
        .where(eq(schema.comparisonSummaries.jobId, jobId));
      const summary = summaryRows[0] || null;

      const mappings = await db
        .select()
        .from(schema.comparisonColumnMappings)
        .where(eq(schema.comparisonColumnMappings.jobId, jobId));

      const results = await db
        .select()
        .from(schema.comparisonResults)
        .where(eq(schema.comparisonResults.jobId, jobId))
        .limit(5000);

      return { job, summary, mappings, results };
    });

    if (!data || !data.job || !data.summary) {
      return NextResponse.json({ error: "Comparison job or summary not found" }, { status: 404 });
    }

    const { job, summary: s, mappings: dbMappings, results: dbResults } = data;

    const s1Meta = (job.source1Metadata as any) || {};
    const s2Meta = (job.source2Metadata as any) || {};

    const meta: ReportMetadata = {
      jobName: job.name,
      source1Name: s1Meta.name || "Source 1",
      source2Name: s2Meta.name || "Source 2",
      executedAt: job.completedAt ? new Date(job.completedAt).toLocaleString() : new Date().toLocaleString(),
    };

    const summaryStats: ComparisonSummaryStats = {
      totalSource1: s.totalSource1,
      totalSource2: s.totalSource2,
      matchedCount: s.matchedCount,
      mismatchedCount: s.mismatchedCount,
      orphanSource1Count: s.orphanSource1Count,
      orphanSource2Count: s.orphanSource2Count,
      duplicateCount: s.duplicateCount,
      matchRate: s.matchRate,
      qualityScore: s.qualityScore,
      durationMs: (s.detailsJson as any)?.durationMs || 0,
      qualityBreakdown: (s.detailsJson as any)?.qualityBreakdown || {
        score: s.qualityScore,
        completeness: 100,
        uniqueness: 100,
        validity: 100,
        consistency: 100,
        issuesDetected: [],
      },
      mismatchFieldFrequency: (s.detailsJson as any)?.mismatchFieldFrequency || {},
      duplicateGroups: (s.detailsJson as any)?.duplicateGroups || [],
    };

    const results: ComparisonRecordResult[] = dbResults.map((r) => ({
      id: r.id,
      recordKey: r.recordKey || "",
      status: r.status as any,
      source1Record: r.source1Record as any,
      source2Record: r.source2Record as any,
      differences: (r.differencesJson as any) || [],
    }));

    const mappings: ColumnMappingSuggestion[] = dbMappings.map((m) => ({
      source1Column: m.source1Column,
      source2Column: m.source2Column,
      detectedSimilarity: m.detectedSimilarity,
      mappingMethod: m.mappingMethod as any,
      isKey: m.isKey,
      manuallyConfirmed: m.manuallyConfirmed,
      ignored: m.ignored,
      typeMatch: true,
    }));

    const config: MatchingConfiguration = (job.matchingConfiguration as any) || {
      keyColumns: mappings.filter((m) => m.isKey).map((m) => m.source1Column),
      columnRules: {},
      normalization: {
        trimWhitespace: true,
        caseInsensitive: true,
        ignorePunctuation: false,
        nullEmptyEquivalent: true,
        normalizeNumbers: true,
        normalizeDates: true,
      },
    };

    const safeJobName = job.name.replace(/[^a-zA-Z0-9_-]/g, "_");

    if (format === "html") {
      const html = generateHtmlCompareReport({
        summary: summaryStats,
        results,
        mappings,
        config,
        meta,
      });

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeJobName}_report.html"`,
        },
      });
    }

    if (format === "pdf") {
      const pdfBuffer = await generatePdfCompareReport({
        summary: summaryStats,
        results,
        meta,
      });

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeJobName}_report.pdf"`,
        },
      });
    }

    // Default: Multi-sheet Excel (.xlsx)
    const excelBuffer = await generateExcelCompareReport({
      summary: summaryStats,
      results,
      mappings,
      config,
      meta,
    });

    return new NextResponse(new Uint8Array(excelBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeJobName}_report.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error("Export error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate report" },
      { status: 500 },
    );
  }
}
