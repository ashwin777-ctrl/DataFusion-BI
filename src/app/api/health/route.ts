import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Liveness + DB readiness probe (PRD S0). */
export async function GET() {
  const checks: Record<string, "ok" | "fail"> = { app: "ok" };
  let healthy = true;
  try {
    checks.database = (await pingDb()) ? "ok" : "fail";
  } catch {
    checks.database = "fail";
    healthy = false;
  }
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks, time: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}
