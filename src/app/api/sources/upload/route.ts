import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { ingestUploadedFile } from "@/lib/engine/ingest-file";
import { getOrgStorageDir } from "@/lib/engine/duckdb";
import { createHash, randomUUID } from "node:crypto";
import { writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { session, orgId } = await requireOrg();
    const userId = session.user.id;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const selectedSheet = (formData.get("sheet") as string) || undefined;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const byteSize = buffer.byteLength;
    const originalName = file.name;
    const sha256 = createHash("sha256").update(buffer).digest("hex");

    const lower = originalName.toLowerCase();
    const detectedKind = lower.endsWith(".xlsx")
      ? "xlsx"
      : lower.endsWith(".xls")
        ? "xls"
        : lower.endsWith(".tsv")
          ? "tsv"
          : "csv";

    const fileId = randomUUID();
    const rawStoragePath = join(
      getOrgStorageDir(orgId),
      `${fileId}_${originalName}`,
    );
    writeFileSync(rawStoragePath, buffer);

    const sourceId = randomUUID();
    const ingestResult = await ingestUploadedFile({
      orgId,
      sourceId,
      fileName: originalName,
      buffer,
      selectedSheet,
    });

    const parquetBytes = statSync(ingestResult.primaryParquetPath).size;

    // Save metadata in PostgreSQL under RLS
    await withOrg(orgId, async (db) => {
      // 1. Insert sourceFile
      await db.insert(schema.sourceFiles).values({
        id: fileId,
        orgId,
        originalName,
        storagePath: rawStoragePath,
        byteSize,
        sha256,
        detectedKind,
        uploadedBy: userId,
        status: "ready",
      });

      // 2. Insert source
      const alias = originalName
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .toLowerCase();

      await db.insert(schema.sources).values({
        id: sourceId,
        orgId,
        kind: "excel_sheet",
        alias,
        sourceFileId: fileId,
        sheetName: selectedSheet || ingestResult.sheets[0]?.sheetName || "Default",
        rowCount: ingestResult.profile.rowCount,
        parquetPath: ingestResult.primaryParquetPath,
        parquetBytes,
        profiledAt: new Date(),
      });

      // 3. Insert column profiles
      let ordinal = 0;
      for (const col of ingestResult.profile.columns) {
        await db.insert(schema.columnProfiles).values({
          id: randomUUID(),
          orgId,
          sourceId,
          ordinal: ordinal++,
          rawName: col.name,
          normalizedName: col.name.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
          storageType: col.originalType,
          semanticRole: col.role,
          semanticSubtype: col.inferredType,
          confidence: 0.9,
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

    return NextResponse.json({
      success: true,
      sourceId,
      fileId,
      fileName: originalName,
      sheets: ingestResult.sheets,
      profile: ingestResult.profile,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process uploaded file" },
      { status: 500 },
    );
  }
}
