import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { inferDatasetRelationships } from "@/lib/engine/relationships";
import { withDuckDB, getSourceParquetPath } from "@/lib/engine/duckdb";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();

    const body = await req.json();
    const { sourceIds } = body as { sourceIds: string[] };

    if (!sourceIds || sourceIds.length < 2) {
      return NextResponse.json(
        { error: "At least two source IDs are required to infer relationships" },
        { status: 400 },
      );
    }

    const allSources = await withOrg(orgId, async (db) => {
      return await db.select().from(schema.sources).where(eq(schema.sources.orgId, orgId));
    });

    const sources = allSources.filter((s) => sourceIds.includes(s.id));
    if (sources.length < 2) {
      return NextResponse.json(
        { error: "Selected sources not found" },
        { status: 404 },
      );
    }

    const allInferred = await withDuckDB(async (conn) => {
      const results = [];
      for (let i = 0; i < sources.length; i++) {
        for (let j = i + 1; j < sources.length; j++) {
          const s1 = sources[i];
          const s2 = sources[j];
          if (s1 && s2) {
            const inferred = await inferDatasetRelationships(
              conn,
              {
                id: s1.id,
                name: s1.alias,
                parquetPath: s1.parquetPath || getSourceParquetPath(orgId, s1.id),
              },
              {
                id: s2.id,
                name: s2.alias,
                parquetPath: s2.parquetPath || getSourceParquetPath(orgId, s2.id),
              },
            );
            results.push(...inferred);
          }
        }
      }
      return results;
    });

    return NextResponse.json({ relationships: allInferred });
  } catch (err: any) {
    console.error("Relationship inference error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to infer relationships" },
      { status: 500 },
    );
  }
}
