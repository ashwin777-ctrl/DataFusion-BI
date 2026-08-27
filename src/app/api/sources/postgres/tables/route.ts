import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { listPostgresTables } from "@/lib/engine/ingest-postgres";

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

    const tables = await listPostgresTables({
      host,
      port: Number(port || 5432),
      database,
      user,
      password,
      ssl,
    });

    return NextResponse.json({ tables });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to list tables" },
      { status: 500 },
    );
  }
}
