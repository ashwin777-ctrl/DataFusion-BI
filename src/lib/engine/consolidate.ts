import { withDuckDB, getDatasetParquetPath } from "./duckdb";
import { profileParquetFile, type DatasetProfile } from "./profile";
import { buildTransformSql, type TransformStep } from "./transform";

export interface DatasetSourceConfig {
  sourceId: string;
  sourceName: string;
  parquetPath: string;
  alias: string;
  role: "fact" | "dimension";
  transforms?: TransformStep[];
}

export interface JoinConfig {
  leftAlias: string;
  leftColumn: string;
  rightAlias: string;
  rightColumn: string;
  joinType: "inner" | "left" | "right" | "full" | "union";
}

export interface ConsolidateDatasetParams {
  orgId: string;
  datasetId: string;
  datasetName: string;
  sources: DatasetSourceConfig[];
  joins: JoinConfig[];
}

/**
 * Consolidate multiple sources (Excel + Postgres) into a single optimized Parquet dataset.
 */
export async function consolidateDataset(
  params: ConsolidateDatasetParams,
): Promise<{
  datasetId: string;
  parquetPath: string;
  profile: DatasetProfile;
}> {
  const { orgId, datasetId, sources, joins } = params;
  const targetParquetPath = getDatasetParquetPath(orgId, datasetId);
  const normTargetPath = targetParquetPath.replace(/\\/g, "/");

  if (sources.length === 0) {
    throw new Error("At least one source is required to build a dataset");
  }

  const profile = await withDuckDB(async (conn) => {
    // 1. Register each source as a DuckDB view with optional transformations applied
    for (const src of sources) {
      const transformSql = buildTransformSql(src.parquetPath, src.transforms || []);
      await conn.run(`CREATE OR REPLACE VIEW "${src.alias}" AS ${transformSql}`);
    }

    // 2. Build the consolidation SQL query
    let consolidationSql: string;

    if (sources.length === 1 && sources[0]) {
      consolidationSql = `SELECT * FROM "${sources[0].alias}"`;
    } else if (joins.length > 0 && joins[0]?.joinType === "union") {
      // Union consolidation
      consolidationSql = sources
        .map((s) => `SELECT * FROM "${s.alias}"`)
        .join(" UNION ALL ");
    } else {
      // Relational join consolidation
      const primary = sources[0]!;
      let joinClauses = "";

      for (const j of joins) {
        const joinKw =
          j.joinType === "inner"
            ? "INNER JOIN"
            : j.joinType === "left"
              ? "LEFT JOIN"
              : j.joinType === "right"
                ? "RIGHT JOIN"
                : "FULL OUTER JOIN";

        joinClauses += `
          ${joinKw} "${j.rightAlias}" 
          ON "${j.leftAlias}"."${j.leftColumn.replace(/"/g, '""')}" = "${j.rightAlias}"."${j.rightColumn.replace(/"/g, '""')}"
        `;
      }

      const secondarySelects = sources.slice(1).map((s) => {
        const rightExcludeCols = joins
          .filter((j) => j.rightAlias === s.alias)
          .map((j) => `"${j.rightColumn.replace(/"/g, '""')}"`);

        if (rightExcludeCols.length > 0) {
          return `"${s.alias}".* EXCLUDE (${rightExcludeCols.join(", ")})`;
        }
        return `"${s.alias}".*`;
      });

      consolidationSql = `
        SELECT 
          "${primary.alias}".*${secondarySelects.length > 0 ? `, ${secondarySelects.join(", ")}` : ""}
        FROM "${primary.alias}"
        ${joinClauses}
      `;
    }

    // 3. Materialize to final Parquet file
    await conn.run(
      `COPY (${consolidationSql}) TO '${normTargetPath}' (FORMAT PARQUET, COMPRESSION ZSTD)`,
    );

    // 4. Profile the consolidated dataset
    return await profileParquetFile(conn, targetParquetPath);
  });

  return {
    datasetId,
    parquetPath: targetParquetPath,
    profile,
  };
}
