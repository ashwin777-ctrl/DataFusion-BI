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

    return NextResponse.json(
      { sources: sourcesList },
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
      { error: err.message || "Failed to fetch sources" },
      { status: err.status || 500 },
    );
  }
}
