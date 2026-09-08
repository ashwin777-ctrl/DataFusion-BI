import { DuckDBInstance } from "@duckdb/node-api";
import fs from "node:fs";
import pg from "pg";

async function main() {
  const db = await DuckDBInstance.create();
  const conn = await db.connect();
  const tmpParquet = "./scripts/housing_temp.parquet";
  await conn.run("CREATE TABLE t AS SELECT * FROM read_csv('./scripts/boston_housing.csv', header=true, auto_detect=true)");
  await conn.run(`COPY t TO '${tmpParquet.replace(/\\/g, "/")}' (FORMAT PARQUET, COMPRESSION ZSTD)`);
  
  const parquetBuffer = fs.readFileSync(tmpParquet);
  const csvBuffer = fs.readFileSync("./scripts/boston_housing.csv");

  const c = new pg.Client({
    connectionString: "postgresql://postgres.ipeibuxcwsejijkpgjiy:QAZJpO5k66bOv9qb@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const sourcePath = "/tmp/storage/8996a94e-3512-4e70-9fd3-851b22de5474/sources/3d613bf0-97c1-4edb-8ce7-a47c443c7f85.parquet";
  const dsPath = "/tmp/storage/8996a94e-3512-4e70-9fd3-851b22de5474/datasets/50e63741-c9b9-42bc-aaf5-af379940a42d.parquet";
  const rawCsvPath = "/tmp/storage/8996a94e-3512-4e70-9fd3-851b22de5474/331e0468-c041-4079-a025-ecc574757f4e_housing.csv";

  await c.query(
    `INSERT INTO storage_blobs (path, content, byte_size)
     VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9)
     ON CONFLICT (path) DO UPDATE SET content = EXCLUDED.content, byte_size = EXCLUDED.byte_size`,
    [sourcePath, parquetBuffer, parquetBuffer.length, dsPath, parquetBuffer, parquetBuffer.length, rawCsvPath, csvBuffer, csvBuffer.length]
  );
  console.log("Successfully seeded storage_blobs in Supabase!");
  await c.end();

  if (fs.existsSync(tmpParquet)) {
    fs.unlinkSync(tmpParquet);
  }
}

main().catch(console.error);
