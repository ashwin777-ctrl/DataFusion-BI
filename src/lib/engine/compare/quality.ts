import type { QualityMetricBreakdown, ColumnMappingSuggestion } from "./types";

export function assessDataQuality(params: {
  totalS1: number;
  totalS2: number;
  matchedCount: number;
  mismatchedCount: number;
  orphanS1Count: number;
  orphanS2Count: number;
  duplicateCount: number;
  mismatchFieldFrequency: Record<string, number>;
  duplicateGroups: Array<{ source: "source1" | "source2"; key: string; occurrences: number }>;
  s1Rows: Record<string, any>[];
  s2Rows: Record<string, any>[];
  mappings: ColumnMappingSuggestion[];
}): QualityMetricBreakdown {
  const {
    totalS1,
    totalS2,
    matchedCount,
    mismatchedCount,
    orphanS1Count,
    orphanS2Count,
    duplicateCount,
    mismatchFieldFrequency,
    duplicateGroups,
    s1Rows,
    s2Rows,
    mappings,
  } = params;

  const issues: QualityMetricBreakdown["issuesDetected"] = [];

  // 1. Completeness (Null checking)
  let totalNulls = 0;
  let totalCells = 0;

  for (const m of mappings) {
    let s1ColNulls = 0;
    for (const r of s1Rows) {
      const v = r[m.source1Column];
      if (v === null || v === undefined || v === "") s1ColNulls++;
    }
    let s2ColNulls = 0;
    for (const r of s2Rows) {
      const v = r[m.source2Column];
      if (v === null || v === undefined || v === "") s2ColNulls++;
    }

    totalNulls += s1ColNulls + s2ColNulls;
    totalCells += s1Rows.length + s2Rows.length;

    const s1NullRate = s1Rows.length > 0 ? (s1ColNulls / s1Rows.length) * 100 : 0;
    const s2NullRate = s2Rows.length > 0 ? (s2ColNulls / s2Rows.length) * 100 : 0;

    if (s1NullRate > 20) {
      issues.push({
        type: "missing",
        severity: s1NullRate > 50 ? "high" : "medium",
        description: `Source 1 column '${m.source1Column}' has ${Math.round(s1NullRate)}% missing/null values`,
        affectedColumn: m.source1Column,
        count: s1ColNulls,
      });
    }
    if (s2NullRate > 20) {
      issues.push({
        type: "missing",
        severity: s2NullRate > 50 ? "high" : "medium",
        description: `Source 2 column '${m.source2Column}' has ${Math.round(s2NullRate)}% missing/null values`,
        affectedColumn: m.source2Column,
        count: s2ColNulls,
      });
    }
  }

  const nullRatio = totalCells > 0 ? totalNulls / totalCells : 0;
  const completeness = Math.max(0, Math.min(100, Math.round((1.0 - nullRatio) * 100)));

  // 2. Uniqueness (Duplicate Checking)
  const maxRows = Math.max(totalS1 + totalS2, 1);
  const duplicateRatio = duplicateCount / maxRows;
  const uniqueness = Math.max(0, Math.min(100, Math.round((1.0 - duplicateRatio) * 100)));

  if (duplicateGroups.length > 0) {
    issues.push({
      type: "duplicate",
      severity: duplicateCount > 10 ? "high" : "medium",
      description: `Detected ${duplicateGroups.length} duplicate primary key groups affecting ${duplicateCount} records`,
      count: duplicateCount,
    });
  }

  // 3. Consistency (Field-level mismatches & schema alignment)
  for (const [col, count] of Object.entries(mismatchFieldFrequency)) {
    const rate = totalS1 > 0 ? (count / totalS1) * 100 : 0;
    if (rate > 10) {
      issues.push({
        type: "format",
        severity: rate > 40 ? "high" : "medium",
        description: `High discrepancy rate (${Math.round(rate)}%) on mapped field '${col}'`,
        affectedColumn: col,
        count,
      });
    }
  }

  const totalCompared = matchedCount + mismatchedCount;
  const matchConsistency = totalCompared > 0 ? (matchedCount / totalCompared) * 100 : 100;
  const consistency = Math.round(matchConsistency);

  // 4. Validity (Orphan rates & unmapped columns)
  const orphanCount = orphanS1Count + orphanS2Count;
  const totalRecords = Math.max(totalS1 + totalS2, 1);
  const orphanRate = (orphanCount / totalRecords) * 100;

  if (orphanRate > 15) {
    issues.push({
      type: "unmatched_schema",
      severity: orphanRate > 40 ? "high" : "medium",
      description: `${orphanCount} records (${Math.round(orphanRate)}%) could not be paired between datasets`,
      count: orphanCount,
    });
  }

  const validity = Math.max(0, Math.min(100, Math.round(100 - orphanRate * 0.75)));

  // Overall Score (Weighted)
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        completeness * 0.25 +
        uniqueness * 0.25 +
        validity * 0.25 +
        consistency * 0.25
      ),
    ),
  );

  return {
    score,
    completeness,
    uniqueness,
    validity,
    consistency,
    issuesDetected: issues,
  };
}
