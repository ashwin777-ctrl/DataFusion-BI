import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { withOrg, schema } from "@/lib/db";
import { desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId } = await requireOrg();

    const schedules = await withOrg(orgId, async (db) => {
      return await db
        .select()
        .from(schema.comparisonSchedules)
        .orderBy(desc(schema.comparisonSchedules.createdAt));
    });

    return NextResponse.json({ schedules });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch comparison schedules" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const body = await req.json();

    const { name, cronExpression = "0 0 * * *", config } = body;

    if (!name) {
      return NextResponse.json({ error: "Schedule name is required" }, { status: 400 });
    }

    const scheduleId = randomUUID();

    const created = await withOrg(orgId, async (db) => {
      const res = await db
        .insert(schema.comparisonSchedules)
        .values({
          id: scheduleId,
          orgId,
          name,
          cronExpression,
          config: config || {},
          status: "active",
          nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .returning();
      return res[0];
    });

    return NextResponse.json({ success: true, schedule: created });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create comparison schedule" },
      { status: 500 },
    );
  }
}
