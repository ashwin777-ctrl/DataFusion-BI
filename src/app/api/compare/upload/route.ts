import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { ingestCompareDataset } from "@/lib/engine/compare/ingest";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const jobId = (formData.get("jobId") as string) || randomUUID();
    const sourceIndexRaw = formData.get("sourceIndex") as string;
    const sourceIndex = sourceIndexRaw === "2" ? 2 : 1;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const profile = await ingestCompareDataset({
      orgId,
      jobId,
      sourceIndex,
      filename: file.name,
      buffer,
    });

    return NextResponse.json({
      success: true,
      jobId,
      sourceIndex,
      profile,
    });
  } catch (err: any) {
    console.error("Compare upload error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process dataset upload" },
      { status: 500 },
    );
  }
}
