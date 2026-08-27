import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { generateSampleEnterpriseWorkbook } from "@/lib/fixtures/sample-data";
import { ingestUploadedFile } from "@/lib/engine/ingest-file";
import { getOrgStorageDir } from "@/lib/engine/duckdb";
import { consolidateDataset } from "@/lib/engine/consolidate";
import { randomUUID } from "node:crypto";
import { writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";

/**
 * 1-click sample enterprise dataset loader (Sales, Targets, Products, Customers).
 */
export async function POST() {
  try {
    const { session, orgId } = await requireOrg();
    const userId = session.user.id;

    const workbookBuffer = await generateSampleEnterpriseWorkbook();
    const fileName = "Enterprise_Global_Sales_FY25_26.xlsx";
    const fileId = randomUUID();
    const rawStoragePath = join(getOrgStorageDir(orgId), `${fileId}_${fileName}`);
    writeFileSync(rawStoragePath, workbookBuffer);

    // Save sourceFile
    await withOrg(orgId, async (db) => {
      await db.insert(schema.sourceFiles).values({
        id: fileId,
        orgId,
        originalName: fileName,
        storagePath: rawStoragePath,
        byteSize: workbookBuffer.byteLength,
        sha256: "sample-enterprise-workbook",
        detectedKind: "xlsx",
        uploadedBy: userId,
        status: "ready",
      });
    });

    const sheets = ["Orders", "Targets", "Products", "Customers"];
    const createdSources: Array<{ id: string; alias: string; parquetPath: string; role: "fact" | "dimension" }> = [];

    for (const sheet of sheets) {
      const sourceId = randomUUID();
      const ingestRes = await ingestUploadedFile({
        orgId,
        sourceId,
        fileName,
        buffer: workbookBuffer,
        selectedSheet: sheet,
      });

      const parquetBytes = statSync(ingestRes.primaryParquetPath).size;
      const alias = sheet.toLowerCase();

      await withOrg(orgId, async (db) => {
        await db.insert(schema.sources).values({
          id: sourceId,
          orgId,
          kind: "excel_sheet",
          alias,
          sourceFileId: fileId,
          sheetName: sheet,
          rowCount: ingestRes.profile.rowCount,
          parquetPath: ingestRes.primaryParquetPath,
          parquetBytes,
          profiledAt: new Date(),
        });

        let ord = 0;
        for (const col of ingestRes.profile.columns) {
          await db.insert(schema.columnProfiles).values({
            id: randomUUID(),
            orgId,
            sourceId,
            ordinal: ord++,
            rawName: col.name,
            normalizedName: col.name.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
            storageType: col.originalType,
            semanticRole: col.role,
            semanticSubtype: col.inferredType,
            confidence: 0.95,
            nullCount: col.nullCount,
            distinctCount: col.distinctCount,
            cardinalityRatio: col.rowCount > 0 ? col.distinctCount / col.rowCount : 0,
            minValue: col.min != null ? String(col.min) : null,
            maxValue: col.max != null ? String(col.max) : null,
            stats: {
              mean: col.mean,
              sum: col.sum,
              stdDev: col.stdDev,
              topValues: col.topValues,
            },
            sampleValues: col.sampleValues,
          });
        }
      });

      createdSources.push({
        id: sourceId,
        alias,
        parquetPath: ingestRes.primaryParquetPath,
        role: sheet === "Orders" ? "fact" : "dimension",
      });
    }

    // Auto-create consolidated dataset joining Orders with Products and Customers
    const datasetId = randomUUID();
    const ordersSrc = createdSources.find((s) => s.alias === "orders")!;
    const productsSrc = createdSources.find((s) => s.alias === "products")!;
    const customersSrc = createdSources.find((s) => s.alias === "customers")!;

    const consolidationRes = await consolidateDataset({
      orgId,
      datasetId,
      datasetName: "Consolidated Global Enterprise Sales",
      sources: [
        {
          sourceId: ordersSrc.id,
          sourceName: "Orders",
          parquetPath: ordersSrc.parquetPath,
          alias: "orders",
          role: "fact",
        },
        {
          sourceId: productsSrc.id,
          sourceName: "Products",
          parquetPath: productsSrc.parquetPath,
          alias: "products",
          role: "dimension",
        },
        {
          sourceId: customersSrc.id,
          sourceName: "Customers",
          parquetPath: customersSrc.parquetPath,
          alias: "customers",
          role: "dimension",
        },
      ],
      joins: [
        {
          leftAlias: "orders",
          leftColumn: "product_id",
          rightAlias: "products",
          rightColumn: "product_id",
          joinType: "left",
        },
        {
          leftAlias: "orders",
          leftColumn: "customer_id",
          rightAlias: "customers",
          rightColumn: "customer_id",
          joinType: "left",
        },
      ],
    });

    const dsStorageBytes = statSync(consolidationRes.parquetPath).size;

    await withOrg(orgId, async (db) => {
      await db.insert(schema.datasets).values({
        id: datasetId,
        orgId,
        name: "Consolidated Global Enterprise Sales",
        status: "ready",
        factSourceId: ordersSrc.id,
        duckdbPath: consolidationRes.parquetPath,
        storageBytes: dsStorageBytes,
        rowCount: consolidationRes.profile.rowCount,
        dataVersion: 1,
        lastRefreshedAt: new Date(),
        createdBy: userId,
      });

      // Add relationships
      await db.insert(schema.relationships).values([
        {
          id: randomUUID(),
          orgId,
          datasetId,
          leftSourceId: ordersSrc.id,
          leftColumns: ["product_id"],
          rightSourceId: productsSrc.id,
          rightColumns: ["product_id"],
          joinType: "left",
          cardinality: "N:1",
          confidence: 1.0,
          origin: "inferred",
          isEnabled: true,
          userConfirmedAt: new Date(),
        },
        {
          id: randomUUID(),
          orgId,
          datasetId,
          leftSourceId: ordersSrc.id,
          leftColumns: ["customer_id"],
          rightSourceId: customersSrc.id,
          rightColumns: ["customer_id"],
          joinType: "left",
          cardinality: "N:1",
          confidence: 1.0,
          origin: "inferred",
          isEnabled: true,
          userConfirmedAt: new Date(),
        },
      ]);
    });

    return NextResponse.json({
      success: true,
      message: "Sample enterprise dataset and consolidated model created successfully",
      datasetId,
      sourcesCount: createdSources.length,
      rowCount: consolidationRes.profile.rowCount,
      profile: consolidationRes.profile,
    });
  } catch (err: any) {
    console.error("Sample dataset load error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load sample dataset" },
      { status: 500 },
    );
  }
}
