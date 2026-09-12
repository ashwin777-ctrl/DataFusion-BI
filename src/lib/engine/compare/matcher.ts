import { queryDuckDB, withDuckDB, ensureStorageBlob, toCanonicalLocalPath } from "@/lib/engine/duckdb";
import type {
  MatchingConfiguration,
  ColumnMappingSuggestion,
  ComparisonRecordResult,
  FieldDifference,
  ComparisonSummaryStats,
} from "@/lib/engine/compare/types";
import { assessDataQuality } from "@/lib/engine/compare/quality";
import { randomUUID } from "node:crypto";

export function cleanCompareVal(val: any): any {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === "object") {
    if (typeof val.toISOString === "function") {
      return val.toISOString().slice(0, 10);
    }
    if ("days" in val && typeof val.days === "number") {
      const d = new Date(val.days * 86400000);
      return d.toISOString().slice(0, 10);
    }
    if ("micros" in val) {
      const d = new Date(Number(BigInt(val.micros) / 1000n));
      return d.toISOString().slice(0, 10);
    }
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return val;
}

function normalizeVal(val: any, options: MatchingConfiguration["normalization"]): any {
  const cleaned = cleanCompareVal(val);
  if (cleaned === null || cleaned === undefined) {
    return options.nullEmptyEquivalent ? "" : null;
  }
  let str = String(cleaned);

  if (options.trimWhitespace) {
    str = str.trim();
  }

  if (options.nullEmptyEquivalent && str === "") {
    return "";
  }

  if (options.caseInsensitive) {
    str = str.toLowerCase();
  }

  if (options.ignorePunctuation) {
    str = str.replace(/[^a-z0-9\s]/gi, "");
  }

  if (options.normalizeNumbers) {
    const cleanNum = str.replace(/[\$,€£\s]/g, "").replace(/,/g, "");
    const num = Number(cleanNum);
    if (!isNaN(num) && cleanNum.trim() !== "") {
      return num;
    }
  }

  if (options.normalizeDates) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0]; // YYYY-MM-DD
    }
  }

  return str;
}

function compareFuzzy(s1: string, s2: string, threshold: number): boolean {
  if (s1 === s2) return true;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return true;
  // Simple token + character overlap
  let matches = 0;
  for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) matches++;
  }
  const ratio = matches / maxLen;
  return ratio >= threshold;
}

export async function executeComparison(params: {
  source1Parquet: string;
  source2Parquet: string;
  mappings: ColumnMappingSuggestion[];
  config: MatchingConfiguration;
}): Promise<{
  summary: ComparisonSummaryStats;
  results: ComparisonRecordResult[];
}> {
  const startTime = Date.now();
  const { source1Parquet, source2Parquet, mappings, config } = params;
  const normS1 = toCanonicalLocalPath(source1Parquet).replace(/\\/g, "/");
  const normS2 = toCanonicalLocalPath(source2Parquet).replace(/\\/g, "/");

  // Ensure parquet files exist on local ephemeral filesystem (Vercel serverless cold-start resiliency)
  await ensureStorageBlob(normS1, source1Parquet);
  await ensureStorageBlob(normS2, source2Parquet);

  return await withDuckDB(async (conn) => {
    // 1. Identify Key Columns
    const activeMappings = mappings.filter((m) => !m.ignored && m.source2Column);
    const keyMappings =
      config.keyColumns && config.keyColumns.length > 0
        ? activeMappings.filter((m) => config.keyColumns.includes(m.source1Column))
        : activeMappings.filter((m) => m.isKey);
    if (keyMappings.length === 0) {
      throw new Error("No primary key column selected for matching. Please specify at least one key column.");
    }

    // 2. Load all rows from both datasets
    const s1RawRows = await queryDuckDB<Record<string, any>>(
      conn,
      `SELECT * FROM read_parquet('${normS1}');`,
    );
    const s2RawRows = await queryDuckDB<Record<string, any>>(
      conn,
      `SELECT * FROM read_parquet('${normS2}');`,
    );

    const cleanRow = (row: Record<string, any>) => {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(row)) {
        out[k] = cleanCompareVal(v);
      }
      return out;
    };

    const s1Rows = s1RawRows.map(cleanRow);
    const s2Rows = s2RawRows.map(cleanRow);

    const totalS1 = s1Rows.length;
    const totalS2 = s2Rows.length;

    // 3. Duplicate Key Detection
    const s1KeyCounts = new Map<string, number>();
    const s2KeyCounts = new Map<string, number>();

    const makeKey = (row: Record<string, any>, isS1: boolean) => {
      const parts = keyMappings.map((km) => {
        const col = isS1 ? km.source1Column : km.source2Column;
        const raw = row[col];
        const norm = normalizeVal(raw, config.normalization);
        return String(norm ?? "");
      });
      return parts.join("::");
    };

    for (const r of s1Rows) {
      const k = makeKey(r, true);
      s1KeyCounts.set(k, (s1KeyCounts.get(k) || 0) + 1);
    }
    for (const r of s2Rows) {
      const k = makeKey(r, false);
      s2KeyCounts.set(k, (s2KeyCounts.get(k) || 0) + 1);
    }

    const s1Duplicates = new Set<string>();
    const s2Duplicates = new Set<string>();
    const duplicateGroups: ComparisonSummaryStats["duplicateGroups"] = [];

    s1KeyCounts.forEach((count, k) => {
      if (count > 1) {
        s1Duplicates.add(k);
        duplicateGroups.push({ source: "source1", key: k, occurrences: count });
      }
    });
    s2KeyCounts.forEach((count, k) => {
      if (count > 1) {
        s2Duplicates.add(k);
        duplicateGroups.push({ source: "source2", key: k, occurrences: count });
      }
    });

    // 4. Build Lookups for Matching
    const s1ByKey = new Map<string, Record<string, any>>();
    const s2ByKey = new Map<string, Record<string, any>>();

    for (const r of s1Rows) {
      const k = makeKey(r, true);
      if (!s1Duplicates.has(k)) {
        s1ByKey.set(k, r);
      }
    }
    for (const r of s2Rows) {
      const k = makeKey(r, false);
      if (!s2Duplicates.has(k)) {
        s2ByKey.set(k, r);
      }
    }

    const results: ComparisonRecordResult[] = [];
    let matchedCount = 0;
    let mismatchedCount = 0;
    let orphanS1Count = 0;
    let orphanS2Count = 0;
    let duplicateCount = 0;
    const mismatchFieldFreq: Record<string, number> = {};

    // 5. Add Duplicates to Results
    for (const r of s1Rows) {
      const k = makeKey(r, true);
      if (s1Duplicates.has(k)) {
        duplicateCount++;
        results.push({
          id: randomUUID(),
          recordKey: k,
          status: "duplicate",
          source1Record: r,
          source2Record: null,
          differences: [
            {
              field: keyMappings.map((m) => m.source1Column).join(", "),
              source1Value: k,
              source2Value: null,
              status: "mismatch",
              reason: `Duplicate key (${s1KeyCounts.get(k)} occurrences in Source 1)`,
            },
          ],
        });
      }
    }
    for (const r of s2Rows) {
      const k = makeKey(r, false);
      if (s2Duplicates.has(k)) {
        duplicateCount++;
        results.push({
          id: randomUUID(),
          recordKey: k,
          status: "duplicate",
          source1Record: null,
          source2Record: r,
          differences: [
            {
              field: keyMappings.map((m) => m.source2Column).join(", "),
              source1Value: null,
              source2Value: k,
              status: "mismatch",
              reason: `Duplicate key (${s2KeyCounts.get(k)} occurrences in Source 2)`,
            },
          ],
        });
      }
    }

    // 6. Match Non-Duplicate Records
    const visitedS2Keys = new Set<string>();

    for (const [k, r1] of s1ByKey.entries()) {
      const r2 = s2ByKey.get(k);

      if (!r2) {
        orphanS1Count++;
        results.push({
          id: randomUUID(),
          recordKey: k,
          status: "orphan_source1",
          source1Record: r1,
          source2Record: null,
          differences: [],
        });
        continue;
      }

      visitedS2Keys.add(k);

      // Compare non-key columns
      const differences: FieldDifference[] = [];
      let isRowMatch = true;

      for (const map of activeMappings) {
        const v1Raw = r1[map.source1Column];
        const v2Raw = r2[map.source2Column];

        const rule = config.columnRules[map.source1Column] || {
          column: map.source1Column,
          mode: "exact",
        };

        const v1Norm = normalizeVal(v1Raw, config.normalization);
        const v2Norm = normalizeVal(v2Raw, config.normalization);

        let fieldMatches = false;
        let reason = "";
        let delta: number | null = null;

        if (v1Norm === v2Norm) {
          fieldMatches = true;
        } else if (rule.mode === "numeric_tolerance") {
          const n1 = Number(v1Norm);
          const n2 = Number(v2Norm);
          if (!isNaN(n1) && !isNaN(n2)) {
            const diff = Math.abs(n1 - n2);
            delta = Math.round((n2 - n1) * 1000) / 1000;
            const tolVal = rule.numericToleranceValue ?? 0.01;

            if (rule.numericToleranceType === "percentage") {
              const pct = (diff / Math.max(Math.abs(n1), 1e-9)) * 100;
              if (pct <= tolVal) {
                fieldMatches = true;
              } else {
                reason = `Numeric difference of ${delta} (${Math.round(pct * 10) / 10}%) exceeds ±${tolVal}%`;
              }
            } else {
              if (diff <= tolVal) {
                fieldMatches = true;
              } else {
                reason = `Numeric difference of ${delta} exceeds tolerance of ±${tolVal}`;
              }
            }
          } else {
            reason = "Could not parse values as numbers for numeric tolerance comparison";
          }
        } else if (rule.mode === "date_proximity") {
          const d1 = new Date(String(v1Raw)).getTime();
          const d2 = new Date(String(v2Raw)).getTime();
          if (!isNaN(d1) && !isNaN(d2)) {
            const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
            const maxDays = rule.dateWindowDays ?? 1;
            if (diffDays <= maxDays) {
              fieldMatches = true;
            } else {
              reason = `Dates differ by ${Math.round(diffDays)} days (window: ±${maxDays} days)`;
            }
          } else {
            reason = "Could not parse values as dates for date proximity comparison";
          }
        } else if (rule.mode === "fuzzy") {
          const s1Str = String(v1Norm ?? "");
          const s2Str = String(v2Norm ?? "");
          const threshold = rule.fuzzyThreshold ?? 0.85;
          if (compareFuzzy(s1Str, s2Str, threshold)) {
            fieldMatches = true;
          } else {
            reason = `Fuzzy text similarity is below threshold (${threshold * 100}%)`;
          }
        } else {
          // Exact mode
          reason = "Values do not match exactly";
        }

        if (fieldMatches) {
          differences.push({
            field: map.source1Column,
            source1Value: v1Raw,
            source2Value: v2Raw,
            status: "match",
          });
        } else {
          isRowMatch = false;
          mismatchFieldFreq[map.source1Column] = (mismatchFieldFreq[map.source1Column] || 0) + 1;
          differences.push({
            field: map.source1Column,
            source1Value: v1Raw,
            source2Value: v2Raw,
            status: "mismatch",
            reason,
            differenceAmount: delta,
          });
        }
      }

      if (isRowMatch) {
        matchedCount++;
        results.push({
          id: randomUUID(),
          recordKey: k,
          status: "matched",
          source1Record: r1,
          source2Record: r2,
          differences,
        });
      } else {
        mismatchedCount++;
        results.push({
          id: randomUUID(),
          recordKey: k,
          status: "mismatched",
          source1Record: r1,
          source2Record: r2,
          differences,
        });
      }
    }

    // 7. Check for Source 2 Orphans (keys in S2 but not in S1)
    for (const [k, r2] of s2ByKey.entries()) {
      if (!visitedS2Keys.has(k)) {
        orphanS2Count++;
        results.push({
          id: randomUUID(),
          recordKey: k,
          status: "orphan_source2",
          source1Record: null,
          source2Record: r2,
          differences: [],
        });
      }
    }

    const durationMs = Date.now() - startTime;
    const matchRate = totalS1 > 0 ? Math.round((matchedCount / totalS1) * 1000) / 10 : 0;

    // Assess overall Data Quality
    const qualityBreakdown = assessDataQuality({
      totalS1,
      totalS2,
      matchedCount,
      mismatchedCount,
      orphanS1Count,
      orphanS2Count,
      duplicateCount,
      mismatchFieldFrequency: mismatchFieldFreq,
      duplicateGroups,
      s1Rows,
      s2Rows,
      mappings: activeMappings,
    });

    const summary: ComparisonSummaryStats = {
      totalSource1: totalS1,
      totalSource2: totalS2,
      matchedCount,
      mismatchedCount,
      orphanSource1Count: orphanS1Count,
      orphanSource2Count: orphanS2Count,
      duplicateCount,
      matchRate,
      qualityScore: qualityBreakdown.score,
      durationMs,
      qualityBreakdown,
      mismatchFieldFrequency: mismatchFieldFreq,
      duplicateGroups,
    };

    return { summary, results };
  });
}
