import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId } = await requireOrg();

    const sourcesList = await withOrg(orgId, async (db) => {
      return await db
        .select()
        .from(schema.sources)
        .orderBy(desc(schema.sources.createdAt));
    });

    return NextResponse.json({ sources: sourcesList });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch sources" },
      { status: err.status || 500 },
    );
  }
}
