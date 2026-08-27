/**
 * Lifecycle manager for the self-contained dev PostgreSQL cluster (PRD FR-1.6).
 *
 * Docker is not installed and the system PostgreSQL on :5432 has an unknown
 * password, so development uses a private, non-invasive PostgreSQL 16 cluster on
 * port 5434 with credentials we control. This script is the promised
 * `scripts/local-db.*` helper referenced by .env.
 *
 * Binaries live in .pgsql/pg/bin (portable Zonky embedded-postgres distribution)
 * and cluster data in .pgdata — both gitignored. The one-time binary download is
 * documented at the bottom of this file; everything after that is automated here.
 *
 * Usage (via npm scripts):
 *   npm run db:status        # is the cluster up? which version, port, pid?
 *   npm run db:start         # start it (idempotent; no-op if already running)
 *   npm run db:stop          # stop it (fast shutdown)
 *   npm run db:init          # initdb (if empty) + start + bootstrap roles/db
 *
 * Readiness is probed with a real `pg` connection because the portable bundle
 * ships no pg_isready binary.
 */
import pg from "pg";
import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync, unlinkSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(process.cwd());
const PG_HOME = process.env.PG_HOME ?? join(ROOT, ".pgsql", "pg");
const PG_BIN = join(PG_HOME, "bin");
const PGDATA = process.env.PGDATA ?? join(ROOT, ".pgdata");
const PORT = process.env.PGPORT ?? "5434";
const LOGFILE = join(PGDATA, "server.log");

// Superuser for cluster-level ops (never written to .env — dev-only defaults).
const SUPER_USER = process.env.PG_SUPERUSER ?? "bi_super";
const SUPER_PW = process.env.PG_SUPERPW ?? "bi_super_pw";
const SUPER_URL =
  process.env.SUPERUSER_URL ??
  `postgres://${SUPER_USER}:${SUPER_PW}@127.0.0.1:${PORT}/postgres`;

const exe = (name) => join(PG_BIN, process.platform === "win32" ? `${name}.exe` : name);

function requireBinaries() {
  if (!existsSync(exe("pg_ctl")) || !existsSync(exe("initdb"))) {
    console.error(
      `PostgreSQL binaries not found under ${PG_BIN}.\n` +
        "Run the one-time download documented at the bottom of scripts/local-db.mjs,\n" +
        "or set PG_HOME to an existing PostgreSQL 16 distribution.",
    );
    process.exit(1);
  }
}

/** Try a real connection; returns the server version string or null if down. */
async function probe() {
  const client = new pg.Client({
    connectionString: SUPER_URL,
    connectionTimeoutMillis: 2000,
  });
  try {
    await client.connect();
    const { rows } = await client.query("SHOW server_version");
    return rows[0].server_version;
  } catch {
    return null;
  } finally {
    await client.end().catch(() => {});
  }
}

function pidFromPidfile() {
  const pidfile = join(PGDATA, "postmaster.pid");
  if (!existsSync(pidfile)) return null;
  try {
    return readFileSync(pidfile, "utf8").split("\n")[0].trim() || null;
  } catch {
    return null;
  }
}

async function status() {
  const version = await probe();
  if (version) {
    console.log(
      `● running — PostgreSQL ${version} on 127.0.0.1:${PORT} (pid ${pidFromPidfile() ?? "?"})`,
    );
    return true;
  }
  console.log(`○ stopped — no server responding on 127.0.0.1:${PORT}`);
  return false;
}

async function waitReady(timeoutMs = 30000) {
  // Poll with bounded attempts until the server accepts a connection.
  const attempts = Math.ceil(timeoutMs / 500);
  for (let i = 0; i < attempts; i++) {
    if (await probe()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function start() {
  requireBinaries();
  if (await probe()) {
    console.log(`Already running on port ${PORT}.`);
    return;
  }
  if (!existsSync(join(PGDATA, "PG_VERSION"))) {
    console.error(`No cluster at ${PGDATA}. Run: npm run db:init`);
    process.exit(1);
  }
  console.log(`Starting cluster (data=${PGDATA}, port=${PORT})…`);
  // -l redirects the server log to a file so pg_ctl does not hold a pipe open;
  // -w waits for readiness; -t bounds the wait so it can never hang forever.
  const res = spawnSync(
    exe("pg_ctl"),
    ["-D", PGDATA, "-l", LOGFILE, "-o", `-p ${PORT}`, "-w", "-t", "30", "start"],
    { encoding: "utf8" },
  );
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (!(await waitReady())) {
    console.error(`Cluster did not become ready. See ${LOGFILE}.`);
    process.exit(1);
  }
  console.log(`✓ ready on 127.0.0.1:${PORT}`);
}

async function stop() {
  requireBinaries();
  if (!(await probe())) {
    console.log("Already stopped.");
    return;
  }
  console.log("Stopping cluster (fast)…");
  const res = spawnSync(exe("pg_ctl"), ["-D", PGDATA, "-m", "fast", "stop"], {
    encoding: "utf8",
  });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  console.log("✓ stopped");
}

async function init() {
  requireBinaries();
  if (existsSync(join(PGDATA, "PG_VERSION"))) {
    console.log(`Cluster already initialized at ${PGDATA}; skipping initdb.`);
  } else {
    console.log(`Initializing cluster at ${PGDATA} (superuser ${SUPER_USER})…`);
    const pwfile = join(ROOT, ".pgpw.tmp");
    writeFileSync(pwfile, SUPER_PW, { mode: 0o600 });
    try {
      const res = spawnSync(
        exe("initdb"),
        [
          "-D", PGDATA,
          "-U", SUPER_USER,
          "--auth=scram-sha-256",
          `--pwfile=${pwfile}`,
          "--encoding=UTF8",
        ],
        { encoding: "utf8" },
      );
      if (res.stdout) process.stdout.write(res.stdout);
      if (res.stderr) process.stderr.write(res.stderr);
      if (res.status !== 0) {
        console.error("initdb failed.");
        process.exit(1);
      }
    } finally {
      unlinkSync(pwfile);
    }
  }

  await start();

  console.log("Bootstrapping roles + database (bi_owner, bi_app, bi_platform)…");
  const boot = spawnSync(
    process.execPath,
    [join(ROOT, "scripts", "bootstrap-db.mjs")],
    { encoding: "utf8", env: { ...process.env, SUPERUSER_URL: SUPER_URL } },
  );
  if (boot.stdout) process.stdout.write(boot.stdout);
  if (boot.stderr) process.stderr.write(boot.stderr);
  if (boot.status !== 0) {
    console.error("bootstrap failed.");
    process.exit(1);
  }
  console.log("\n✓ init complete. Next: npm run db:migrate");
}

const cmd = process.argv[2];
const actions = { status, start, stop, init };
if (!actions[cmd]) {
  console.error("Usage: node scripts/local-db.mjs <status|start|stop|init>");
  process.exit(1);
}
actions[cmd]().catch((e) => {
  console.error(e);
  process.exit(1);
});

/*
 * ── One-time binary provisioning (already done for this checkout) ────────────
 * The portable PostgreSQL 16 distribution comes from Zonky's embedded-postgres
 * binaries on Maven Central (no admin rights, no installer, no system changes):
 *
 *   1. Download the platform jar, e.g. for Windows x86_64, PostgreSQL 16.14:
 *        io.zonky.test.postgres:embedded-postgres-binaries-windows-amd64:16.14.0
 *      → save as .pgsql/pg.jar
 *   2. The jar contains a .txz; extract it, then extract the .txz into .pgsql/pg
 *      so that .pgsql/pg/bin/{initdb,pg_ctl,postgres}.exe exist.
 *   3. npm run db:init   (initdb + start + bootstrap)
 *   4. npm run db:migrate
 *
 * For a different OS/arch, swap the classifier (e.g. -linux-amd64, -darwin-arm64v8).
 */
