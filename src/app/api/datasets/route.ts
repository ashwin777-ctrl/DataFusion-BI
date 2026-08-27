import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { consolidateDataset, type JoinConfig } from "@/lib/engine/consolidate";
import { getSourceParquetPath } from "@/lib/engine/duckdb";
import { randomUUID } from "node:crypto";
import { statSync } from "node:fs";

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

    return NextResponse.json({ datasets: datasetsList });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch datasets" },
      { status: 500 },
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

    // Retrieve sources
    const dbSources = await withOrg(orgId, async (db) => {
      return await db.select().from(schema.sources).where(eq(schema.sources.orgId, orgId));
    });

    const selectedSources = dbSources.filter((s) => sourceIds.includes(s.id));
    if (selectedSources.length !== sourceIds.length || selectedSources.length === 0 || !selectedSources[0]) {
      return NextResponse.json(
        { error: "One or more selected sources could not be found" },
        { status: 400 },
      );
    }

    const datasetId = randomUUID();
    const primarySource = selectedSources[0];

    const consolidationRes = await consolidateDataset({
      orgId,
      datasetId,
      datasetName: name,
      sources: selectedSources.map((s, idx) => ({
        sourceId: s.id,
        sourceName: s.alias,
        parquetPath: s.parquetPath || getSourceParquetPath(orgId, s.id),
        alias: s.alias,
        role: idx === 0 ? "fact" : "dimension",
      })),
      joins: joins || [],
    });

    const dsStorageBytes = statSync(consolidationRes.parquetPath).size;

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
