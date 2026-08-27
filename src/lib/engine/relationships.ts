import { type DuckDBConnection } from "@duckdb/node-api";
import { queryDuckDB } from "./duckdb";

export interface InferredRelationship {
  sourceLeftId: string;
  sourceLeftName: string;
  columnLeft: string;
  sourceRightId: string;
  sourceRightName: string;
  columnRight: string;
  cardinality: "1:1" | "1:N" | "N:1" | "N:M";
  confidence: number; // 0.0 - 1.0
  overlapPercentage: number;
  isFanoutRisk: boolean;
  explanation: string;
}

/**
 * Automatically inspect two Parquet datasets and infer potential join relationships.
 */
export async function inferDatasetRelationships(
  conn: DuckDBConnection,
  left: { id: string; name: string; parquetPath: string },
  right: { id: string; name: string; parquetPath: string },
): Promise<InferredRelationship[]> {
  const normLeft = left.parquetPath.replace(/\\/g, "/");
  const normRight = right.parquetPath.replace(/\\/g, "/");

  const leftCols = await queryDuckDB<{ column_name: string; column_type: string }>(
    conn,
    `DESCRIBE SELECT * FROM read_parquet('${normLeft}')`,
  );
  const rightCols = await queryDuckDB<{ column_name: string; column_type: string }>(
    conn,
    `DESCRIBE SELECT * FROM read_parquet('${normRight}')`,
  );

  const relationships: InferredRelationship[] = [];

  for (const l of leftCols) {
    const lName = l.column_name.toLowerCase();
    for (const r of rightCols) {
      const rName = r.column_name.toLowerCase();

      // Check name affinity (exact match or common FK pattern e.g. customer_id <-> id or customer_id <-> customer_id)
      let nameScore = 0;
      if (lName === rName) {
        nameScore = 0.9;
      } else if (
        (lName.endsWith(`_${rName}`) || rName.endsWith(`_${lName}`)) &&
        (rName === "id" || lName === "id" || rName === "code" || lName === "code" || rName === "key" || lName === "key")
      ) {
        nameScore = 0.85;
      } else if (
        lName.replace(/[^a-z0-9]/g, "") === rName.replace(/[^a-z0-9]/g, "")
      ) {
        nameScore = 0.8;
      }

      if (nameScore === 0) continue;

      // Check value overlap & distinct counts in DuckDB
      try {
        const checkSql = `
          WITH l_vals AS (
            SELECT DISTINCT "${l.column_name}" as val 
            FROM read_parquet('${normLeft}') 
            WHERE "${l.column_name}" IS NOT NULL
          ),
          r_vals AS (
            SELECT DISTINCT "${r.column_name}" as val 
            FROM read_parquet('${normRight}') 
            WHERE "${r.column_name}" IS NOT NULL
          ),
          overlap AS (
            SELECT COUNT(*) as count 
            FROM l_vals 
            INNER JOIN r_vals ON CAST(l_vals.val AS VARCHAR) = CAST(r_vals.val AS VARCHAR)
          ),
          counts AS (
            SELECT 
              (SELECT COUNT(*) FROM l_vals) as l_distinct,
              (SELECT COUNT(*) FROM r_vals) as r_distinct,
              (SELECT COUNT(*) FROM read_parquet('${normLeft}')) as l_total,
              (SELECT COUNT(*) FROM read_parquet('${normRight}')) as r_total
          )
          SELECT 
            overlap.count as match_count,
            counts.l_distinct,
            counts.r_distinct,
            counts.l_total,
            counts.r_total
          FROM overlap, counts;
        `;

        const res = await queryDuckDB<{
          match_count: number;
          l_distinct: number;
          r_distinct: number;
          l_total: number;
          r_total: number;
        }>(conn, checkSql);

        const data = res[0];
        if (!data || data.match_count === 0) continue;

        const minDistinct = Math.min(data.l_distinct, data.r_distinct);
        const overlapPct = minDistinct > 0 ? (data.match_count / minDistinct) * 100 : 0;

        if (overlapPct < 30) continue; // Not enough common keys

        const leftUnique = data.l_distinct === data.l_total;
        const rightUnique = data.r_distinct === data.r_total;

        let cardinality: "1:1" | "1:N" | "N:1" | "N:M" = "N:M";
        if (leftUnique && rightUnique) cardinality = "1:1";
        else if (leftUnique && !rightUnique) cardinality = "1:N";
        else if (!leftUnique && rightUnique) cardinality = "N:1";
        else cardinality = "N:M";

        const isFanoutRisk = cardinality === "N:M";
        const confidence = Number(
          ((nameScore * 0.5 + (overlapPct / 100) * 0.5)).toFixed(2),
        );

        relationships.push({
          sourceLeftId: left.id,
          sourceLeftName: left.name,
          columnLeft: l.column_name,
          sourceRightId: right.id,
          sourceRightName: right.name,
          columnRight: r.column_name,
          cardinality,
          confidence,
          overlapPercentage: Number(overlapPct.toFixed(1)),
          isFanoutRisk,
          explanation: `Matched "${l.column_name}" on ${left.name} to "${r.column_name}" on ${right.name} with ${overlapPct.toFixed(1)}% key overlap (${cardinality} cardinality).`,
        });
      } catch {
        // Skip incompatible type comparison
      }
    }
  }

  return relationships.sort((a, b) => b.confidence - a.confidence);
}
