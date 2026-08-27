import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { withDuckDB, queryDuckDB, getSourceParquetPath } from "@/lib/engine/duckdb";
import { unlinkSync, existsSync } from "node:fs";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrg();
    const { id: sourceId } = await params;

    const sourceData = await withOrg(orgId, async (db) => {
      const src = await db
        .select()
        .from(schema.sources)
        .where(and(eq(schema.sources.id, sourceId), eq(schema.sources.orgId, orgId)))
        .limit(1);

      if (!src || src.length === 0 || !src[0]) return null;

      const cols = await db
        .select()
        .from(schema.columnProfiles)
        .where(eq(schema.columnProfiles.sourceId, sourceId))
        .orderBy(schema.columnProfiles.ordinal);

      return { source: src[0], columns: cols };
    });

    if (!sourceData || !sourceData.source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    const parquetPath = sourceData.source.parquetPath || getSourceParquetPath(orgId, sourceId);
    let previewRows: any[] = [];

    if (existsSync(parquetPath)) {
      previewRows = await withDuckDB(async (conn) => {
        const norm = parquetPath.replace(/\\/g, "/");
        return await queryDuckDB(conn, `SELECT * FROM read_parquet('${norm}') LIMIT 100`);
      });
    }

    return NextResponse.json({
      source: sourceData.source,
      columns: sourceData.columns,
      preview: previewRows,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch source details" },
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
    const { id: sourceId } = await params;

    await withOrg(orgId, async (db) => {
      const src = await db
        .select()
        .from(schema.sources)
        .where(and(eq(schema.sources.id, sourceId), eq(schema.sources.orgId, orgId)))
        .limit(1);

      if (src && src.length > 0 && src[0]) {
        const pPath = src[0].parquetPath;
        if (pPath && existsSync(pPath)) {
          try {
            unlinkSync(pPath);
          } catch {
            // ignore
          }
        }
        await db.delete(schema.sources).where(eq(schema.sources.id, sourceId));
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete source" },
      { status: 500 },
    );
  }
}
