import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { consolidateDataset, type JoinConfig } from "@/lib/engine/consolidate";
import { resolveSourceParquetPath, ensureStorageBlob, persistStorageBlob } from "@/lib/engine/duckdb";
import { randomUUID } from "node:crypto";
import { statSync, readFileSync } from "node:fs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId } = await requireOrg();

    const datasetsList = await withOrg(orgId, async (db) => {
      return await db
        .select()
        .from(schema.datasets)
        .where(eq(schema.datasets.orgId, orgId))
        .orderBy(desc(schema.datasets.createdAt));
    });

    return NextResponse.json(
      { datasets: datasetsList },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=30",
        },
      },
    );
  } catch (err: any) {
    if (err?.digest?.includes?.("NEXT_REDIRECT") || err?.message === "NEXT_REDIRECT" || err?.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to fetch datasets" },
      { status: err.status || 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, orgId } = await requireOrg();
    const userId = session.user.id;

    const body = await req.json();
    const { name, sourceIds, joins } = body as {
      name: string;
      sourceIds: string[];
      joins?: JoinConfig[];
    };

    if (!name || !sourceIds || sourceIds.length === 0) {
      return NextResponse.json(
        { error: "Dataset name and at least one source ID are required" },
        { status: 400 },
      );
    }

    // Fetch sources from DB under RLS
    const selectedSources = await withOrg(orgId, async (db) => {
      return await db
        .select()
        .from(schema.sources)
        .where(eq(schema.sources.orgId, orgId));
    }).then((sources) => sources.filter((s) => sourceIds.includes(s.id)));

    if (selectedSources.length === 0) {
      return NextResponse.json(
        { error: "No valid sources found for the given IDs" },
        { status: 404 },
      );
    }

    const datasetId = randomUUID();
    const primarySource = selectedSources[0];
    if (!primarySource) {
      return NextResponse.json(
        { error: "No valid sources found for the given IDs" },
        { status: 404 },
      );
    }

    // Ensure all selected source Parquet files are present locally
    await Promise.all(
      selectedSources.map((s) => {
        const canonicalPath = resolveSourceParquetPath(orgId, s.id, s.parquetPath);
        return ensureStorageBlob(canonicalPath, s.parquetPath);
      }),
    );

    const consolidationRes = await consolidateDataset({
      orgId,
      datasetId,
      datasetName: name,
      sources: selectedSources.map((s, idx) => ({
        sourceId: s.id,
        sourceName: s.alias,
        parquetPath: resolveSourceParquetPath(orgId, s.id, s.parquetPath),
        alias: s.alias,
        role: idx === 0 ? "fact" : "dimension",
      })),
      joins: joins || [],
    });

    const dsStorageBytes = statSync(consolidationRes.parquetPath).size;

    // Persist consolidated dataset Parquet to PostgreSQL storage_blobs
    try {
      const parquetBuf = readFileSync(consolidationRes.parquetPath);
      await persistStorageBlob(consolidationRes.parquetPath, parquetBuf);
    } catch (e) {
      console.error("Failed to persist consolidated parquet blob:", e);
    }

    await withOrg(orgId, async (db) => {
      await db.insert(schema.datasets).values({
        id: datasetId,
        orgId,
        name,
        status: "ready",
        factSourceId: primarySource.id,
        duckdbPath: consolidationRes.parquetPath,
        storageBytes: dsStorageBytes,
        rowCount: consolidationRes.profile.rowCount,
        dataVersion: 1,
        lastRefreshedAt: new Date(),
        createdBy: userId,
      });

      for (const s of selectedSources) {
        await db.insert(schema.datasetSources).values({
          id: randomUUID(),
          orgId,
          datasetId,
          sourceId: s.id,
          alias: s.alias,
          role: s.id === primarySource.id ? "fact" : "dimension",
        });
      }

      if (joins && joins.length > 0) {
        for (const j of joins) {
          const lSrc = selectedSources.find((s) => s.alias === j.leftAlias);
          const rSrc = selectedSources.find((s) => s.alias === j.rightAlias);
          if (lSrc && rSrc) {
            await db.insert(schema.relationships).values({
              id: randomUUID(),
              orgId,
              datasetId,
              leftSourceId: lSrc.id,
              leftColumns: [j.leftColumn],
              rightSourceId: rSrc.id,
              rightColumns: [j.rightColumn],
              joinType: j.joinType,
              origin: "manual",
              isEnabled: true,
              userConfirmedAt: new Date(),
            });
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      datasetId,
      name,
      rowCount: consolidationRes.profile.rowCount,
      profile: consolidationRes.profile,
    });
  } catch (err: any) {
    console.error("Dataset creation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create dataset" },
      { status: 500 },
    );
  }
}
