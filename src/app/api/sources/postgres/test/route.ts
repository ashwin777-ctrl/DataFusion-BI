import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { testPostgresConnection } from "@/lib/engine/ingest-postgres";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireOrg();
    const body = await req.json();
    const { host, port, database, user, password, ssl } = body;

    if (!host || !database || !user) {
      return NextResponse.json(
        { error: "Host, database, and user are required" },
        { status: 400 },
      );
    }

    const res = await testPostgresConnection({
      host,
      port: Number(port || 5432),
      database,
      user,
      password,
      ssl,
    });

    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to test connection" },
      { status: 500 },
    );
  }
}
