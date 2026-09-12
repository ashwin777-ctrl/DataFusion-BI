import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { inferColumnMappings } from "@/lib/engine/compare/mapper";
import type { ColumnProfile } from "@/lib/engine/compare/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireOrg();
    const body = await req.json();
    const { source1Columns, source2Columns } = body as {
      source1Columns: ColumnProfile[];
      source2Columns: ColumnProfile[];
    };

    if (!source1Columns || !source2Columns) {
      return NextResponse.json(
        { error: "Both source1Columns and source2Columns are required" },
        { status: 400 },
      );
    }

    const mappings = inferColumnMappings(source1Columns, source2Columns);

    return NextResponse.json({
      success: true,
      mappings,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to infer column mappings" },
      { status: 500 },
    );
  }
}
