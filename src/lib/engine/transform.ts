export type TransformAction =
  | "filter"
  | "rename"
  | "cast"
  | "fillna"
  | "drop_nulls"
  | "calculated_column"
  | "deduplicate"
  | "replace";

export interface TransformStep {
  id: string;
  action: TransformAction;
  column?: string;
  newColumnName?: string;
  targetType?: "VARCHAR" | "BIGINT" | "DOUBLE" | "DATE" | "TIMESTAMP" | "BOOLEAN";
  fillValue?: string | number;
  filterCondition?: string; // e.g. "amount > 0" or "status = 'active'"
  formula?: string; // e.g. "price * quantity * (1 - discount)"
  replaceFrom?: string;
  replaceTo?: string;
}

/**
 * Apply a pipeline of transformation steps on a source table or Parquet path and produce a new DuckDB table/view.
 */
export function buildTransformSql(
  baseTableOrPath: string,
  steps: TransformStep[],
): string {
  const isParquet = baseTableOrPath.endsWith(".parquet");
  const sourceRef = isParquet
    ? `read_parquet('${baseTableOrPath.replace(/\\/g, "/")}')`
    : `"${baseTableOrPath}"`;

  let currentSql = `SELECT * FROM ${sourceRef}`;

  for (const step of steps) {
    if (step.action === "filter" && step.filterCondition) {
      currentSql = `SELECT * FROM (${currentSql}) _sub WHERE ${step.filterCondition}`;
    } else if (step.action === "drop_nulls" && step.column) {
      const col = `"${step.column.replace(/"/g, '""')}"`;
      currentSql = `SELECT * FROM (${currentSql}) _sub WHERE ${col} IS NOT NULL`;
    } else if (step.action === "fillna" && step.column) {
      const col = `"${step.column.replace(/"/g, '""')}"`;
      const fill =
        typeof step.fillValue === "number"
          ? step.fillValue
          : `'${String(step.fillValue ?? "").replace(/'/g, "''")}'`;
      currentSql = `SELECT _sub.* EXCLUDE (${col}), COALESCE(${col}, ${fill}) AS ${col} FROM (${currentSql}) _sub`;
    } else if (step.action === "rename" && step.column && step.newColumnName) {
      const oldCol = `"${step.column.replace(/"/g, '""')}"`;
      const newCol = `"${step.newColumnName.replace(/"/g, '""')}"`;
      currentSql = `SELECT _sub.* EXCLUDE (${oldCol}), ${oldCol} AS ${newCol} FROM (${currentSql}) _sub`;
    } else if (step.action === "cast" && step.column && step.targetType) {
      const col = `"${step.column.replace(/"/g, '""')}"`;
      currentSql = `SELECT _sub.* EXCLUDE (${col}), TRY_CAST(${col} AS ${step.targetType}) AS ${col} FROM (${currentSql}) _sub`;
    } else if (step.action === "calculated_column" && step.newColumnName && step.formula) {
      const newCol = `"${step.newColumnName.replace(/"/g, '""')}"`;
      currentSql = `SELECT _sub.*, (${step.formula}) AS ${newCol} FROM (${currentSql}) _sub`;
    } else if (step.action === "deduplicate") {
      if (step.column) {
        const col = `"${step.column.replace(/"/g, '""')}"`;
        currentSql = `SELECT * FROM (${currentSql}) _sub QUALIFY ROW_NUMBER() OVER (PARTITION BY ${col}) = 1`;
      } else {
        currentSql = `SELECT DISTINCT * FROM (${currentSql}) _sub`;
      }
    }
  }

  return currentSql;
}
