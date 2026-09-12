import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth/current-user";
import { testPostgresConnection, parsePgConnectionString } from "@/lib/engine/ingest-postgres";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireOrg();
    const body = await req.json();
    const connectionString = body.connectionString || body.uri || body.url;
    let host = body.host || body.hostname || body.dbHost || body.databaseHost;
    let port = body.port || body.dbPort;
    let database = body.database || body.dbName || body.databaseName;
    let user = body.user || body.username || body.dbUser;
    let password = body.password !== undefined ? body.password : (body.pass !== undefined ? body.pass : "");
    let ssl = body.ssl;

    if (connectionString || host?.startsWith("postgres://") || host?.startsWith("postgresql://")) {
      const parsed = parsePgConnectionString(connectionString || host);
      if (parsed) {
        host = parsed.host || host;
        port = parsed.port || port;
        database = parsed.database || database;
        user = parsed.user || user;
        if (!password) password = parsed.password || "";
        if (ssl === undefined) ssl = parsed.ssl;
      }
    }

    // Split host:port if user entered both in host field
    if (host && typeof host === "string" && host.includes(":") && !host.includes("[")) {
      const parts = host.split(":");
      host = parts[0];
      if (parts[1] && !isNaN(Number(parts[1]))) {
        port = Number(parts[1]);
      }
    }

    if (!host || typeof host !== "string" || !host.trim()) {
      return NextResponse.json(
        { ok: false, error: "Database host is required (e.g. 127.0.0.1 or cloud host)" },
        { status: 400 },
      );
    }
    if (!database || typeof database !== "string" || !database.trim()) {
      return NextResponse.json(
        { ok: false, error: "Database name is required (e.g. postgres)" },
        { status: 400 },
      );
    }
    if (!user || typeof user !== "string" || !user.trim()) {
      return NextResponse.json(
        { ok: false, error: "Database username is required (e.g. postgres)" },
        { status: 400 },
      );
    }

    const res = await testPostgresConnection({
      host: host.trim(),
      port: Number(port || 5432),
      database: database.trim(),
      user: user.trim(),
      password,
      ssl,
    });

    return NextResponse.json(res, { status: res.ok ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to test connection" },
      { status: err.status || (err.name === "UnauthorizedError" ? 401 : 500) },
    );
  }
}
