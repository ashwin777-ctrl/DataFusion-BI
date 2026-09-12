export type SupportedFormat = "csv" | "tsv" | "xlsx" | "xls" | "json" | "parquet";

export type MatchStatus =
  | "matched"
  | "mismatched"
  | "orphan_source1"
  | "orphan_source2"
  | "duplicate";

export type ComparisonJobStatus =
  | "draft"
  | "profiling"
  | "mapping"
  | "running"
  | "completed"
  | "failed";

export type MatchingMode =
  | "exact"
  | "fuzzy"
  | "numeric_tolerance"
  | "date_proximity";

export interface ColumnProfile {
  name: string;
  inferredType: "string" | "integer" | "float" | "date" | "timestamp" | "boolean";
  nullCount: number;
  nullPercentage: number;
  distinctCount: number;
  uniquePercentage: number;
  isLikelyKey: boolean;
  min?: string | number | null;
  max?: string | number | null;
  sampleValues: any[];
  formattingIssues?: string[];
}

export interface DatasetProfileInfo {
  filename: string;
  format: SupportedFormat;
  byteSize: number;
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  sampleRecords: Record<string, any>[];
  parquetPath: string;
  storageKey: string;
  sourceType: "FILE" | "POSTGRESQL_EXPORT";
  sourceRole: "PRIMARY" | "SECONDARY";
  isPostgresStaged?: boolean;
  stagingTableName?: string;
}

export interface ColumnMappingSuggestion {
  source1Column: string;
  source2Column: string;
  detectedSimilarity: number; // 0.0 to 1.0
  mappingMethod: "exact" | "normalized" | "semantic" | "cardinality" | "manual";
  isKey: boolean;
  manuallyConfirmed: boolean;
  ignored: boolean;
  typeMatch: boolean;
}

export interface ColumnMatchRule {
  column: string; // source1Column
  mode: MatchingMode;
  fuzzyThreshold?: number; // 0.0 - 1.0 (e.g. 0.85)
  numericToleranceType?: "absolute" | "percentage";
  numericToleranceValue?: number; // e.g. 0.01 or 5
  dateWindowDays?: number; // 0 for exact day, 1 for ±1 day, etc.
}

export interface GlobalNormalizationOptions {
  trimWhitespace: boolean;
  caseInsensitive: boolean;
  ignorePunctuation: boolean;
  nullEmptyEquivalent: boolean;
  normalizeNumbers: boolean;
  normalizeDates: boolean;
}

export interface MatchingConfiguration {
  keyColumns: string[];
  columnRules: Record<string, ColumnMatchRule>;
  normalization: GlobalNormalizationOptions;
}

export interface FieldDifference {
  field: string;
  source1Value: any;
  source2Value: any;
  status: "match" | "mismatch";
  reason?: string;
  differenceAmount?: number | null;
}

export interface ComparisonRecordResult {
  id: string;
  recordKey: string;
  status: MatchStatus;
  source1Record?: Record<string, any> | null;
  source2Record?: Record<string, any> | null;
  differences: FieldDifference[];
}

export interface QualityMetricBreakdown {
  score: number; // 0 - 100
  completeness: number; // null rate impact
  uniqueness: number; // duplicate rate impact
  validity: number; // formatting/type validity impact
  consistency: number; // schema & structure alignment
  issuesDetected: Array<{
    type: "missing" | "duplicate" | "format" | "outlier" | "unmatched_schema";
    severity: "low" | "medium" | "high";
    description: string;
    affectedColumn?: string;
    count?: number;
  }>;
}

export interface ComparisonSummaryStats {
  totalSource1: number;
  totalSource2: number;
  matchedCount: number;
  mismatchedCount: number;
  orphanSource1Count: number;
  orphanSource2Count: number;
  duplicateCount: number;
  matchRate: number; // 0 - 100%
  qualityScore: number; // 0 - 100
  durationMs: number;
  qualityBreakdown: QualityMetricBreakdown;
  mismatchFieldFrequency: Record<string, number>;
  duplicateGroups: Array<{
    source: "source1" | "source2";
    key: string;
    occurrences: number;
  }>;
}
