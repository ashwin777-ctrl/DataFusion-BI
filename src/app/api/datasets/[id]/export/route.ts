import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { withDuckDB, getDatasetParquetPath } from "@/lib/engine/duckdb";
import { profileParquetFile } from "@/lib/engine/profile";
import { computeDatasetKpis } from "@/lib/engine/kpi-engine";
import { generateDatasetInsights } from "@/lib/engine/insights";
import { exportToCsv, exportToExcel, generatePrintableReportHtml } from "@/lib/engine/export";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id: datasetId } = await params;

    const body = await req.json();
    const { format, filterSql } = body as { format: "pdf" | "xlsx" | "csv"; filterSql?: string };

    const dataset = await withOrg(orgId, async (db) => {
      const res = await db
        .select()
        .from(schema.datasets)
        .where(and(eq(schema.datasets.id, datasetId), eq(schema.datasets.orgId, orgId)))
        .limit(1);
      return res[0] || null;
    });

    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    const parquetPath = dataset.duckdbPath || getDatasetParquetPath(orgId, datasetId);

    if (format === "csv") {
      const csvBuffer = await withDuckDB(async (conn) => {
        return await exportToCsv(conn, parquetPath, filterSql);
      });

      return new NextResponse(csvBuffer, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${dataset.name.replace(/[^a-z0-9_]/gi, "_")}.csv"`,
        },
      });
    }

    if (format === "xlsx") {
      const excelBuffer = await withDuckDB(async (conn) => {
        const profile = await profileParquetFile(conn, parquetPath);
        const kpis = await computeDatasetKpis(conn, parquetPath, profile.columns, { filterSql });
        return await exportToExcel(conn, parquetPath, profile, kpis, `${dataset.name} Report`);
      });

      return new NextResponse(excelBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${dataset.name.replace(/[^a-z0-9_]/gi, "_")}.xlsx"`,
        },
      });
    }

    // PDF / Printable Report HTML
    const reportHtml = await withDuckDB(async (conn) => {
      const profile = await profileParquetFile(conn, parquetPath);
      const kpis = await computeDatasetKpis(conn, parquetPath, profile.columns, { filterSql });
      const insights = await generateDatasetInsights(conn, parquetPath, profile, kpis);
      return generatePrintableReportHtml({
        title: "Executive Business Intelligence Report",
        datasetName: dataset.name,
        profile,
        kpis,
        insights,
      });
    });

    return new NextResponse(reportHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${dataset.name.replace(/[^a-z0-9_]/gi, "_")}_report.html"`,
      },
    });
  } catch (err: any) {
    console.error("Export error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to export dataset" },
      { status: 500 },
    );
  }
}
