"use client";

import { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  GitCompare,
  Sliders,
  Play,
  Download,
  FileText,
  FileCode,
  Copy,
  Check,
  Search,
  RefreshCw,
  Clock,
  Database,
  Server,
  Eye,
  EyeOff,
  Table,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  DatasetProfileInfo,
  ColumnMappingSuggestion,
  MatchingConfiguration,
  ComparisonSummaryStats,
  ComparisonRecordResult,
} from "@/lib/engine/compare/types";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatDisplayVal(val: any): string {
  if (val === null || val === undefined) return "<null>";
  if (typeof val === "object") {
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    if (typeof val.toISOString === "function") return val.toISOString().slice(0, 10);
    if ("days" in val && typeof val.days === "number") {
      return new Date(val.days * 86400000).toISOString().slice(0, 10);
    }
    if (val.value !== undefined) return String(val.value);
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

export function CompareWizard({
  onJobComplete,
}: {
  onJobComplete?: (jobId: string) => void;
}) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [jobId, setJobId] = useState<string>(() => generateUUID());
  const [jobName, setJobName] = useState<string>("Dataset Comparison");

  // Step 1: Uploads
  const [source1, setSource1] = useState<DatasetProfileInfo | null>(null);
  const [source2, setSource2] = useState<DatasetProfileInfo | null>(null);
  const [uploadingS1, setUploadingS1] = useState(false);
  const [uploadingS2, setUploadingS2] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewSource, setPreviewSource] = useState<1 | 2 | null>(null);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  // Step 3: Mappings
  const [mappings, setMappings] = useState<ColumnMappingSuggestion[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);

  // Step 4: Configuration
  const [config, setConfig] = useState<MatchingConfiguration>({
    keyColumns: [],
    columnRules: {},
    normalization: {
      trimWhitespace: true,
      caseInsensitive: true,
      ignorePunctuation: false,
      nullEmptyEquivalent: true,
      normalizeNumbers: true,
      normalizeDates: true,
    },
  });

  // Step 5 & 6: Run & Results
  const [comparing, setComparing] = useState(false);
  const [compareStage, setCompareStage] = useState<string>("Initializing...");
  const [summary, setSummary] = useState<ComparisonSummaryStats | null>(null);
  const [results, setResults] = useState<ComparisonRecordResult[]>([]);
  const [activeResultsTab, setActiveResultsTab] = useState<
    "all" | "matches" | "mismatches" | "orphan_s1" | "orphan_s2" | "duplicates" | "quality"
  >("mismatches");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyDiffs, setOnlyDiffs] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Step 7: Export & Schedule
  const [exporting, setExporting] = useState<string | null>(null);
  const [scheduleName, setScheduleName] = useState("");
  const [cronExpression, setCronExpression] = useState("0 0 * * *");
  const [scheduleSaved, setScheduleSaved] = useState(false);

  // ─── Step 1 Handlers ────────────────────────────────────────────────────────
  async function handleFileUpload(file: File, sourceIndex: 1 | 2) {
    try {
      if (sourceIndex === 1) setUploadingS1(true);
      else setUploadingS2(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("jobId", jobId);
      formData.append("sourceIndex", String(sourceIndex));

      const res = await fetch("/api/compare/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      if (sourceIndex === 1) {
        setSource1(data.profile);
      } else {
        setSource2(data.profile);
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload file");
    } finally {
      if (sourceIndex === 1) setUploadingS1(false);
      else setUploadingS2(false);
    }
  }

  async function handleLoadSample() {
    try {
      setLoadingSample(true);
      setUploadError(null);

      const res = await fetch("/api/compare/sample", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sample");

      setJobId(data.jobId);
      setJobName("Sales Ledger vs Bank Settlement Statement");
      setSource1(data.source1);
      setSource2(data.source2);
    } catch (err: any) {
      setUploadError(err.message || "Failed to load sample data");
    } finally {
      setLoadingSample(false);
    }
  }

  // ─── Step 2 -> 3 Transition: Fetch Mapping Suggestions ───────────────────────
  async function prepareMappings() {
    if (!source1 || !source2) return;
    try {
      setMappingLoading(true);
      const res = await fetch("/api/compare/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source1Columns: source1.columns,
          source2Columns: source2.columns,
        }),
      });
      const data = await res.json();
      if (res.ok && data.mappings) {
        setMappings(data.mappings);
        // Default key columns
        const keys = data.mappings
          .filter((m: ColumnMappingSuggestion) => m.isKey)
          .map((m: ColumnMappingSuggestion) => m.source1Column);
        setConfig((prev) => ({ ...prev, keyColumns: keys }));
      }
    } catch (err) {
      console.error("Mapping error:", err);
    } finally {
      setMappingLoading(false);
    }
  }

  // ─── Step 5: Execute Comparison ─────────────────────────────────────────────
  async function runComparison() {
    if (!source1 || !source2) return;
    try {
      setComparing(true);
      setCompareStage("Validating schemas & primary keys...");

      setTimeout(() => setCompareStage("Staging Source 2 in PostgreSQL & caching Parquet..."), 400);
      setTimeout(() => setCompareStage("Running DuckDB analytical hash matching & tolerance checks..."), 900);
      setTimeout(() => setCompareStage("Generating discrepancy matrix & data quality index..."), 1400);

      const res = await fetch("/api/compare/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          jobName,
          source1Parquet: source1.parquetPath,
          source2Parquet: source2.parquetPath,
          source1Name: source1.filename,
          source2Name: source2.filename,
          mappings,
          config,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Comparison execution failed");

      setSummary(data.summary);
      setResults(data.results || []);
      setCurrentStep(6);
      if (onJobComplete) onJobComplete(jobId);
    } catch (err: any) {
      setUploadError(err.message || "Failed to complete comparison");
      setCurrentStep(4);
    } finally {
      setComparing(false);
    }
  }

  // ─── Export Handler ─────────────────────────────────────────────────────────
  async function handleExport(format: "xlsx" | "html" | "pdf") {
    try {
      setExporting(format);
      const res = await fetch(`/api/compare/jobs/${jobId}/export?format=${format}`);
      if (!res.ok) throw new Error("Failed to export report");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `datafusion_compare_${jobId}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Export failed");
    } finally {
      setExporting(null);
    }
  }

  async function handleSaveSchedule() {
    if (!scheduleName) return;
    try {
      const res = await fetch("/api/compare/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: scheduleName,
          cronExpression,
          config: { jobId, jobName, mappings, config },
        }),
      });
      if (res.ok) {
        setScheduleSaved(true);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const steps = [
    { num: 1, label: "Upload" },
    { num: 2, label: "Profile" },
    { num: 3, label: "Map" },
    { num: 4, label: "Configure" },
    { num: 5, label: "Compare" },
    { num: 6, label: "Results" },
    { num: 7, label: "Report" },
  ];

  return (
    <div className="space-y-6">
      {/* Wizard Header & Stepper */}
      <div className="stitch-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <GitCompare className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  DataFusion Compare
                  <Badge variant="outline" className="text-[10px] font-mono text-cyan-400 border-cyan-500/30">
                    ENTERPRISE
                  </Badge>
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automated reconciliation, fuzzy & tolerance matching, and professional discrepancy auditing.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadSample}
              disabled={loadingSample}
              className="gap-1.5 text-xs text-blue-500 border-blue-500/30 hover:bg-blue-500/10"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {loadingSample ? "Loading Demo..." : "Load Sample Enterprise Dataset"}
            </Button>
          </div>
        </div>

        {/* Stepper Navigation */}
        <div className="pt-4 flex items-center justify-between overflow-x-auto">
          {steps.map((s, idx) => {
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div key={s.num} className="flex items-center flex-1 min-w-[90px]">
                <button
                  type="button"
                  onClick={() => {
                    if (isDone || (s.num === 2 && source1 && source2) || (s.num === 3 && source1 && source2)) {
                      setCurrentStep(s.num);
                    }
                  }}
                  className={`flex items-center gap-2 text-xs font-medium transition-all ${
                    isCurrent
                      ? "text-blue-500 font-bold"
                      : isDone
                        ? "text-foreground hover:text-blue-400"
                        : "text-muted-foreground opacity-50"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isDone
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : isCurrent
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                          : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : s.num}
                  </span>
                  <span className="hidden md:inline">{s.label}</span>
                </button>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-[2px] mx-2 transition-colors ${isDone ? "bg-emerald-500/40" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {uploadError && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button type="button" onClick={() => setUploadError(null)} className="font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          STEP 1: UPLOAD SOURCE 1 & SOURCE 2 (EXACTLY TWO SOURCE CARDS)
      ────────────────────────────────────────────────────────────────────────── */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Center VS Divider Badge (Desktop) */}
            <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 items-center justify-center pointer-events-none">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background border-2 border-border shadow-2xl text-xs font-black tracking-widest text-muted-foreground ring-4 ring-background">
                VS
              </div>
            </div>

            {/* SOURCE 1 CARD */}
            <div className="stitch-card p-6 flex flex-col justify-between border-2 border-border hover:border-blue-500/50 transition-all shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                  <Badge variant="outline" className="text-[11px] font-mono uppercase tracking-wider text-blue-500 border-blue-500/30 bg-blue-500/10 font-bold">
                    SOURCE 1
                  </Badge>
                  {source1 && (
                    <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1 font-semibold">
                      <CheckCircle2 className="h-3 w-3" /> Ready
                    </Badge>
                  )}
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-foreground">Upload Data File</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload the dataset to compare.
                  </p>
                </div>

                {/* Formats info pills */}
                <div className="flex items-center gap-1.5 py-1">
                  <span className="text-xs font-mono text-muted-foreground font-medium">
                    Excel • CSV • JSON • TSV • Parquet
                  </span>
                </div>

                {source1 ? (
                  <div className="mt-4 p-4 rounded-xl bg-background border border-border space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-sm flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                        {source1.filename}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {(source1.byteSize / 1024).toFixed(1)} KB
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                      <div className="p-2 rounded-lg bg-muted/30">
                        <span className="text-[10px] uppercase font-mono text-muted-foreground block">Rows</span>
                        <strong className="text-foreground font-semibold">{source1.rowCount.toLocaleString()}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/30">
                        <span className="text-[10px] uppercase font-mono text-muted-foreground block">Columns</span>
                        <strong className="text-foreground font-semibold">{source1.columnCount}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/30">
                        <span className="text-[10px] uppercase font-mono text-muted-foreground block">Format</span>
                        <strong className="text-foreground font-semibold uppercase">{source1.format}</strong>
                      </div>
                    </div>

                    {/* Detected schema chips */}
                    <div className="pt-2">
                      <span className="text-[10px] uppercase font-mono text-muted-foreground block mb-1.5">Detected Schema:</span>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                        {source1.columns.slice(0, 10).map((c) => (
                          <span key={c.name} className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono text-foreground border border-border">
                            {c.name} <span className="text-muted-foreground">({c.inferredType})</span>
                          </span>
                        ))}
                        {source1.columns.length > 10 && (
                          <span className="px-2 py-0.5 rounded bg-muted/50 text-[10px] font-mono text-muted-foreground">
                            +{source1.columns.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setPreviewSource(previewSource === 1 ? null : 1)}
                        className="text-[11px] text-blue-500 hover:text-blue-400 font-medium flex items-center gap-1"
                      >
                        {previewSource === 1 ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {previewSource === 1 ? "Hide Sample Preview" : "Preview Sample Records"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef1.current?.click()}
                    className="mt-6 flex flex-col items-center justify-center p-8 rounded-xl bg-background/50 border-2 border-dashed border-border cursor-pointer hover:border-blue-500/50 hover:bg-background transition-all text-center group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">Drag & drop Source 1 dataset here</span>
                    <span className="text-xs text-muted-foreground mt-1">or click to browse files</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef1.current?.click();
                      }}
                      className="mt-4 gap-1.5 text-xs text-blue-500 border-blue-500/30 hover:bg-blue-500/10 font-medium"
                    >
                      <Upload className="h-3.5 w-3.5" /> [ Browse Files ]
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef1}
                  type="file"
                  accept=".csv,.tsv,.xlsx,.xls,.json,.parquet"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 1)}
                  className="hidden"
                />
              </div>

              <div className="pt-4 mt-6 border-t border-border flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef1.current?.click()}
                  disabled={uploadingS1}
                  className="text-xs"
                >
                  {uploadingS1 ? "Ingesting & Profiling..." : source1 ? "Replace Source 1" : "Browse Files"}
                </Button>
                {source1 && (
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    Status: Ready
                  </Badge>
                )}
              </div>
            </div>

            {/* SOURCE 2 CARD (POSTGRESQL DATASET EXPORT) */}
            <div className="stitch-card p-6 flex flex-col justify-between border-2 border-[#336791]/50 bg-gradient-to-br from-[#336791]/15 via-[#336791]/5 to-transparent hover:border-[#336791] transition-all shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-[#336791]/30 pb-3">
                  <Badge variant="outline" className="text-[11px] font-mono uppercase tracking-wider text-[#4193d5] border-[#336791]/50 bg-[#336791]/20 flex items-center gap-1.5 font-bold">
                    <Database className="h-3.5 w-3.5" /> SOURCE 2
                  </Badge>
                  {source2 && (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      PostgreSQL dataset staged ✓
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    PostgreSQL Dataset
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload a file exported from PostgreSQL.
                  </p>
                  <p className="text-xs text-[#90c5f0] font-medium mt-1.5 italic">
                    “Your PostgreSQL-origin dataset will be staged for comparison.”
                  </p>
                </div>

                {/* Formats info pills */}
                <div className="flex items-center gap-1.5 py-1">
                  <span className="text-xs font-mono text-[#90c5f0] font-medium">
                    Excel • CSV • JSON • TSV • Parquet
                  </span>
                </div>

                {/* Direct Visual Flow Explanation */}
                <div className="p-3 rounded-xl bg-background/80 border border-[#336791]/30 text-xs space-y-2">
                  <div className="font-semibold text-foreground text-[11px] uppercase tracking-wider text-[#4193d5] flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5" /> PostgreSQL Export Staging Pipeline
                  </div>
                  <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono text-muted-foreground">
                    <span className="px-1.5 py-0.5 rounded bg-muted text-foreground">PostgreSQL table</span>
                    <span className="text-[#4193d5]">↓</span>
                    <span className="px-1.5 py-0.5 rounded bg-muted text-foreground">Export as CSV / Excel / JSON / Parquet</span>
                    <span className="text-[#4193d5]">↓</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">Upload here</span>
                    <span className="text-[#4193d5]">↓</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">DataFusion stages it into PostgreSQL</span>
                    <span className="text-[#4193d5]">↓</span>
                    <span className="px-1.5 py-0.5 rounded bg-muted text-foreground">Compare against Source 1</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-border/50">
                    * No live PostgreSQL connection required. Provide PostgreSQL data as an exported file and DataFusion automatically stages it into PostgreSQL.
                  </p>
                </div>

                {source2 ? (
                  <div className="mt-4 p-4 rounded-xl bg-background border border-[#336791]/40 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-sm flex items-center gap-2">
                        <Database className="h-4 w-4 text-[#4193d5]" />
                        {source2.filename}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-semibold border border-emerald-500/20">
                        PostgreSQL dataset staged ✓
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                      <div className="p-2 rounded-lg bg-muted/30">
                        <span className="text-[10px] uppercase font-mono text-muted-foreground block">Rows</span>
                        <strong className="text-foreground font-semibold">{source2.rowCount.toLocaleString()}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/30">
                        <span className="text-[10px] uppercase font-mono text-muted-foreground block">Columns</span>
                        <strong className="text-foreground font-semibold">{source2.columnCount}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/30">
                        <span className="text-[10px] uppercase font-mono text-muted-foreground block">Format</span>
                        <strong className="text-foreground font-semibold uppercase">{source2.format}</strong>
                      </div>
                    </div>

                    {/* Staging table info */}
                    <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-emerald-400">
                        Staged Table: <strong>{source2.stagingTableName || `staging_${jobId.replace(/[^a-zA-Z0-9_]/g, "_")}_s2`}</strong>
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {(source2.byteSize / 1024).toFixed(1)} KB
                      </span>
                    </div>

                    {/* Detected schema chips */}
                    <div className="pt-2">
                      <span className="text-[10px] uppercase font-mono text-muted-foreground block mb-1.5">Detected Schema:</span>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                        {source2.columns.slice(0, 10).map((c) => (
                          <span key={c.name} className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono text-foreground border border-border">
                            {c.name} <span className="text-muted-foreground">({c.inferredType})</span>
                          </span>
                        ))}
                        {source2.columns.length > 10 && (
                          <span className="px-2 py-0.5 rounded bg-muted/50 text-[10px] font-mono text-muted-foreground">
                            +{source2.columns.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setPreviewSource(previewSource === 2 ? null : 2)}
                        className="text-[11px] text-[#4193d5] hover:underline font-medium flex items-center gap-1"
                      >
                        {previewSource === 2 ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {previewSource === 2 ? "Hide Sample Preview" : "Preview Sample Records"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef2.current?.click()}
                    className="mt-6 flex flex-col items-center justify-center p-8 rounded-xl bg-background/50 border-2 border-dashed border-[#336791]/50 cursor-pointer hover:border-[#336791] hover:bg-background transition-all text-center group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-[#336791]/15 text-[#4193d5] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Database className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">Drag & drop PostgreSQL export file here</span>
                    <span className="text-xs text-muted-foreground mt-1">Excel / CSV / JSON / TSV / Parquet</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef2.current?.click();
                      }}
                      className="mt-4 gap-1.5 text-xs text-[#4193d5] border-[#336791]/50 hover:bg-[#336791]/15 font-medium"
                    >
                      <Database className="h-3.5 w-3.5" /> [ Browse Files ]
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef2}
                  type="file"
                  accept=".csv,.tsv,.xlsx,.xls,.json,.parquet"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 2)}
                  className="hidden"
                />
              </div>

              <div className="pt-4 mt-6 border-t border-border flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef2.current?.click()}
                  disabled={uploadingS2}
                  className="text-xs"
                >
                  {uploadingS2 ? "Staging into PostgreSQL..." : source2 ? "Replace PostgreSQL Export" : "Browse Files"}
                </Button>
                {source2 && (
                  <span className="text-[11px] font-mono text-emerald-400 font-medium">
                    PostgreSQL Staged ✓
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sample Preview Drawer (if user clicked preview on Source 1 or Source 2) */}
          {previewSource && (
            <div className="p-4 rounded-xl bg-background border border-border space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground font-mono flex items-center gap-2">
                  <Table className="h-3.5 w-3.5 text-blue-500" />
                  {previewSource === 1
                    ? `Sample Preview: Source 1 — ${source1?.filename} (Normal Dataset)`
                    : `Sample Preview: Source 2 — ${source2?.filename} (PostgreSQL Export Staged)`}
                </h4>
                <button
                  type="button"
                  onClick={() => setPreviewSource(null)}
                  className="text-xs text-muted-foreground hover:text-foreground font-semibold"
                >
                  Close Preview ✕
                </button>
              </div>

              <div className="overflow-x-auto border border-border rounded-lg max-h-56">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="bg-muted/60 border-b border-border text-muted-foreground">
                    <tr>
                      {(previewSource === 1 ? source1 : source2)?.columns.map((c) => (
                        <th key={c.name} className="py-2 px-3 whitespace-nowrap">
                          {c.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(previewSource === 1 ? source1 : source2)?.sampleRecords.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-muted/20">
                        {(previewSource === 1 ? source1 : source2)?.columns.map((c) => (
                          <td key={c.name} className="py-1.5 px-3 whitespace-nowrap text-foreground">
                            {row[c.name] !== null && row[c.name] !== undefined ? String(row[c.name]) : "<null>"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bottom Summary Bar & Continue Action */}
          <div className="p-5 rounded-2xl bg-muted/30 border border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs w-full md:w-auto">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border">
                <span className="font-bold text-blue-500 font-mono">Source 1:</span>
                <span className="font-medium text-foreground">{source1 ? source1.filename : "No file chosen"}</span>
                {source1 && (
                  <>
                    <span className="text-muted-foreground">({source1.rowCount.toLocaleString()} rows, {source1.columnCount} cols)</span>
                    <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">Ready</Badge>
                  </>
                )}
              </div>

              <span className="text-muted-foreground font-bold">vs</span>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-[#336791]/40">
                <span className="font-bold text-[#4193d5] font-mono">Source 2:</span>
                <span className="font-medium text-foreground">{source2 ? source2.filename : "No PostgreSQL export chosen"}</span>
                {source2 && (
                  <>
                    <span className="text-muted-foreground">({source2.rowCount.toLocaleString()} rows, {source2.columnCount} cols)</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold flex items-center gap-1 border border-emerald-500/30">
                      <CheckCircle2 className="h-3 w-3" /> PostgreSQL Staged ✓
                    </span>
                  </>
                )}
              </div>
            </div>

            <Button
              disabled={!source1 || !source2}
              onClick={() => {
                setCurrentStep(2);
                prepareMappings();
              }}
              size="lg"
              className="gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 px-6 font-semibold w-full md:w-auto"
            >
              Continue to Data Profiling
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          STEP 2: PROFILE DATA
      ────────────────────────────────────────────────────────────────────────── */}
      {currentStep === 2 && source1 && source2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Source 1 Schema & Sample */}
            <div className="stitch-card p-5 space-y-4 border-t-4 border-t-blue-500">
              <div className="flex flex-col gap-1.5 border-b border-border pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider text-blue-500 border-blue-500/30 bg-blue-500/10">
                    Source 1 — Normal Uploaded Dataset
                  </Badge>
                  <span className="text-xs text-muted-foreground">{source1.columns.length} columns</span>
                </div>
                <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                  <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                  {source1.filename} ({source1.rowCount.toLocaleString()} rows)
                </h3>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {source1.columns.map((c) => (
                  <div key={c.name} className="flex items-center justify-between p-2 rounded-lg bg-background border border-border text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-medium truncate">{c.name}</span>
                      {c.isLikelyKey && (
                        <Badge variant="outline" className="text-[9px] text-cyan-400 border-cyan-500/30 bg-cyan-500/10">
                          KEY CANDIDATE
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] uppercase font-mono text-muted-foreground">{c.inferredType}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{c.nullPercentage}% null</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Source 2 Schema & Sample */}
            <div className="stitch-card p-5 space-y-4 border-t-4 border-t-[#336791] bg-gradient-to-br from-[#336791]/5 to-transparent">
              <div className="flex flex-col gap-1.5 border-b border-border pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider text-[#4193d5] border-[#336791]/40 bg-[#336791]/15 flex items-center gap-1">
                    <Database className="h-3 w-3" /> Source 2 — PostgreSQL Dataset (Staged)
                  </Badge>
                  <span className="text-xs text-muted-foreground">{source2.columns.length} columns</span>
                </div>
                <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                  <Database className="h-4 w-4 text-[#4193d5]" />
                  {source2.filename} ({source2.rowCount.toLocaleString()} rows)
                </h3>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {source2.columns.map((c) => (
                  <div key={c.name} className="flex items-center justify-between p-2 rounded-lg bg-background border border-border text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-medium truncate">{c.name}</span>
                      {c.isLikelyKey && (
                        <Badge variant="outline" className="text-[9px] text-cyan-400 border-cyan-500/30 bg-cyan-500/10">
                          KEY CANDIDATE
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] uppercase font-mono text-muted-foreground">{c.inferredType}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{c.nullPercentage}% null</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={() => setCurrentStep(1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Upload
            </Button>
            <Button onClick={() => setCurrentStep(3)} className="gap-2">
              Proceed to Column Mapping
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          STEP 3: MAP COLUMNS
      ────────────────────────────────────────────────────────────────────────── */}
      {currentStep === 3 && (
        <div className="stitch-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sliders className="h-4 w-4 text-blue-500" />
                Intelligent Column Mapping Engine
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Heuristic matches calculated via name similarity, type compatibility, and value distributions. Select at least one primary key.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={prepareMappings} disabled={mappingLoading} className="gap-1.5 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 ${mappingLoading ? "animate-spin" : ""}`} />
              Auto-Map Best Matches
            </Button>
          </div>

          {/* Mapping Table */}
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Primary Key</th>
                  <th className="py-2.5 px-4 text-blue-500">Source 1 Column (Normal Dataset)</th>
                  <th className="py-2.5 px-4 text-[#4193d5]">Source 2 Column (PostgreSQL Dataset)</th>
                  <th className="py-2.5 px-4">Confidence</th>
                  <th className="py-2.5 px-4">Method</th>
                  <th className="py-2.5 px-4 text-right">Ignore</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mappings.map((m, idx) => {
                  const confPct = Math.round(m.detectedSimilarity * 100);
                  const confColor =
                    confPct >= 90
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                      : confPct >= 70
                        ? "text-blue-400 bg-blue-500/10 border-blue-500/30"
                        : "text-amber-400 bg-amber-500/10 border-amber-500/30";

                  return (
                    <tr key={m.source1Column} className={`hover:bg-muted/20 transition-colors ${m.ignored ? "opacity-40" : ""}`}>
                      <td className="py-2 px-4">
                        <input
                          type="checkbox"
                          checked={m.isKey}
                          disabled={m.ignored}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setMappings((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, isKey: checked } : item)),
                            );
                            setConfig((prev) => {
                              const newKeys = checked
                                ? Array.from(new Set([...prev.keyColumns, m.source1Column]))
                                : prev.keyColumns.filter((k) => k !== m.source1Column);
                              return { ...prev, keyColumns: newKeys };
                            });
                          }}
                          className="rounded border-input text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                      </td>

                      <td className="py-2 px-4 font-mono font-medium">{m.source1Column}</td>

                      <td className="py-2 px-4">
                        <select
                          value={m.source2Column}
                          disabled={m.ignored}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMappings((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, source2Column: val, mappingMethod: "manual" } : item,
                              ),
                            );
                          }}
                          className="rounded-md border border-input bg-background px-2.5 py-1 text-xs font-mono focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">-- Unmapped --</option>
                          {source2?.columns.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name} ({c.inferredType})
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2 px-4">
                        <Badge variant="outline" className={`text-[10px] font-mono border ${confColor}`}>
                          {confPct}%
                        </Badge>
                      </td>

                      <td className="py-2 px-4 text-muted-foreground uppercase font-mono text-[10px]">
                        {m.mappingMethod}
                      </td>

                      <td className="py-2 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setMappings((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, ignored: !item.ignored } : item)),
                            );
                          }}
                          className="text-[11px] text-muted-foreground hover:text-foreground font-medium"
                        >
                          {m.ignored ? "Restore" : "Ignore"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={() => setCurrentStep(2)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Profile
            </Button>
            <Button
              disabled={!mappings.some((m) => m.isKey && m.source2Column && !m.ignored)}
              onClick={() => setCurrentStep(4)}
              className="gap-2"
            >
              Configure Matching Rules
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          STEP 4: CONFIGURE MATCHING RULES
      ────────────────────────────────────────────────────────────────────────── */}
      {currentStep === 4 && (
        <div className="stitch-card p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-500" />
              Matching Rules & Field Tolerances
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Specify exact, fuzzy, tolerance, and date proximity criteria for comparison.
            </p>
          </div>

          {/* Global Normalizations */}
          <div className="p-4 rounded-xl bg-background border border-border space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">Global Preprocessing & Normalization</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.normalization.trimWhitespace}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      normalization: { ...prev.normalization, trimWhitespace: e.target.checked },
                    }))
                  }
                  className="rounded border-input text-blue-500"
                />
                <span>Trim whitespace</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.normalization.caseInsensitive}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      normalization: { ...prev.normalization, caseInsensitive: e.target.checked },
                    }))
                  }
                  className="rounded border-input text-blue-500"
                />
                <span>Case-insensitive text</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.normalization.nullEmptyEquivalent}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      normalization: { ...prev.normalization, nullEmptyEquivalent: e.target.checked },
                    }))
                  }
                  className="rounded border-input text-blue-500"
                />
                <span>Null & Empty String Equivalence</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.normalization.normalizeNumbers}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      normalization: { ...prev.normalization, normalizeNumbers: e.target.checked },
                    }))
                  }
                  className="rounded border-input text-blue-500"
                />
                <span>Strip Currency/Commas ($1,000 -&gt; 1000)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.normalization.normalizeDates}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      normalization: { ...prev.normalization, normalizeDates: e.target.checked },
                    }))
                  }
                  className="rounded border-input text-blue-500"
                />
                <span>Standardize Date Formats</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.normalization.ignorePunctuation}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      normalization: { ...prev.normalization, ignorePunctuation: e.target.checked },
                    }))
                  }
                  className="rounded border-input text-blue-500"
                />
                <span>Ignore Punctuation</span>
              </label>
            </div>
          </div>

          {/* Per-Column Rules */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">Column-Specific Rules</h4>
            <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-background">
              {mappings
                .filter((m) => !m.ignored && m.source2Column)
                .map((m) => {
                  const rule = config.columnRules[m.source1Column] || {
                    column: m.source1Column,
                    mode: "exact",
                  };

                  return (
                    <div key={m.source1Column} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="min-w-[180px]">
                        <div className="font-mono font-medium flex items-center gap-2">
                          {m.source1Column} <span className="text-muted-foreground">↔</span> {m.source2Column}
                          {m.isKey && <Badge variant="outline" className="text-[9px] text-blue-400 border-blue-500/30">KEY</Badge>}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={rule.mode}
                          onChange={(e) => {
                            const newMode = e.target.value as any;
                            setConfig((prev) => ({
                              ...prev,
                              columnRules: {
                                ...prev.columnRules,
                                [m.source1Column]: { ...rule, mode: newMode },
                              },
                            }));
                          }}
                          className="rounded border border-input bg-background px-2 py-1 text-xs"
                        >
                          <option value="exact">Exact Match</option>
                          <option value="fuzzy">Fuzzy Text Match</option>
                          <option value="numeric_tolerance">Numeric Tolerance</option>
                          <option value="date_proximity">Date Proximity</option>
                        </select>

                        {rule.mode === "numeric_tolerance" && (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={rule.numericToleranceType || "absolute"}
                              onChange={(e) => {
                                const t = e.target.value as any;
                                setConfig((prev) => ({
                                  ...prev,
                                  columnRules: {
                                    ...prev.columnRules,
                                    [m.source1Column]: { ...rule, numericToleranceType: t },
                                  },
                                }));
                              }}
                              className="rounded border border-input bg-background px-1.5 py-1 text-xs"
                            >
                              <option value="absolute">± Value</option>
                              <option value="percentage">± %</option>
                            </select>
                            <input
                              type="number"
                              step="0.01"
                              value={rule.numericToleranceValue ?? 0.01}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setConfig((prev) => ({
                                  ...prev,
                                  columnRules: {
                                    ...prev.columnRules,
                                    [m.source1Column]: { ...rule, numericToleranceValue: val },
                                  },
                                }));
                              }}
                              className="w-16 rounded border border-input bg-background px-2 py-1 text-xs font-mono"
                            />
                          </div>
                        )}

                        {rule.mode === "date_proximity" && (
                          <div className="flex items-center gap-1.5">
                            <span>Window:</span>
                            <select
                              value={rule.dateWindowDays ?? 1}
                              onChange={(e) => {
                                const d = Number(e.target.value);
                                setConfig((prev) => ({
                                  ...prev,
                                  columnRules: {
                                    ...prev.columnRules,
                                    [m.source1Column]: { ...rule, dateWindowDays: d },
                                  },
                                }));
                              }}
                              className="rounded border border-input bg-background px-2 py-1 text-xs font-mono"
                            >
                              <option value={0}>Same day (0 days)</option>
                              <option value={1}>± 1 day</option>
                              <option value={3}>± 3 days</option>
                              <option value={7}>± 7 days</option>
                              <option value={30}>± 30 days</option>
                            </select>
                          </div>
                        )}

                        {rule.mode === "fuzzy" && (
                          <div className="flex items-center gap-1.5">
                            <span>Threshold:</span>
                            <input
                              type="range"
                              min="0.5"
                              max="1.0"
                              step="0.05"
                              value={rule.fuzzyThreshold ?? 0.85}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setConfig((prev) => ({
                                  ...prev,
                                  columnRules: {
                                    ...prev.columnRules,
                                    [m.source1Column]: { ...rule, fuzzyThreshold: val },
                                  },
                                }));
                              }}
                              className="w-20"
                            />
                            <span className="font-mono text-xs w-8">{Math.round((rule.fuzzyThreshold ?? 0.85) * 100)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={() => setCurrentStep(3)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Mapping
            </Button>
            <Button onClick={() => { setCurrentStep(5); runComparison(); }} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Play className="h-4 w-4" /> Run Comparison
            </Button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          STEP 5: RUNNING PROGRESS
      ────────────────────────────────────────────────────────────────────────── */}
      {currentStep === 5 && comparing && (
        <div className="stitch-card p-12 text-center space-y-6 flex flex-col items-center justify-center">
          <div className="h-16 w-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center animate-pulse">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Executing High-Speed Analytical Comparison</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">{compareStage}</p>
          </div>
          <div className="w-full max-w-md bg-muted rounded-full h-2 overflow-hidden">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          STEP 6: REVIEW RESULTS
      ────────────────────────────────────────────────────────────────────────── */}
      {currentStep === 6 && summary && (
        <div className="space-y-6">
          {/* Executive Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="stitch-card p-3 text-center">
              <span className="text-[10px] uppercase font-mono text-muted-foreground">Match Rate</span>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">{summary.matchRate}%</div>
            </div>
            <div className="stitch-card p-3 text-center border-t-2 border-t-blue-500">
              <span className="text-[10px] uppercase font-mono text-blue-500">Source 1 (Normal)</span>
              <div className="text-xl font-bold text-foreground mt-0.5">{summary.totalSource1}</div>
            </div>
            <div className="stitch-card p-3 text-center border-t-2 border-t-[#336791]">
              <span className="text-[10px] uppercase font-mono text-[#4193d5]">Source 2 (Postgres)</span>
              <div className="text-xl font-bold text-foreground mt-0.5">{summary.totalSource2}</div>
            </div>
            <div className="stitch-card p-3 text-center">
              <span className="text-[10px] uppercase font-mono text-muted-foreground">Matches</span>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">{summary.matchedCount}</div>
            </div>
            <div className="stitch-card p-3 text-center">
              <span className="text-[10px] uppercase font-mono text-muted-foreground">Mismatches</span>
              <div className="text-xl font-bold text-rose-500 mt-0.5">{summary.mismatchedCount}</div>
            </div>
            <div className="stitch-card p-3 text-center">
              <span className="text-[10px] uppercase font-mono text-muted-foreground">S1 Orphans (Missing in PG)</span>
              <div className="text-xl font-bold text-amber-500 mt-0.5">{summary.orphanSource1Count}</div>
            </div>
            <div className="stitch-card p-3 text-center">
              <span className="text-[10px] uppercase font-mono text-muted-foreground">S2 Orphans (Missing in S1)</span>
              <div className="text-xl font-bold text-indigo-400 mt-0.5">{summary.orphanSource2Count}</div>
            </div>
            <div className="stitch-card p-3 text-center">
              <span className="text-[10px] uppercase font-mono text-muted-foreground">Quality Score</span>
              <div className="text-xl font-bold text-cyan-400 mt-0.5">{summary.qualityScore}/100</div>
            </div>
          </div>

          {/* Results Navigation Tabs & Search */}
          <div className="stitch-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-1 overflow-x-auto text-xs">
                <button
                  type="button"
                  onClick={() => setActiveResultsTab("mismatches")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    activeResultsTab === "mismatches"
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Mismatches ({summary.mismatchedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResultsTab("matches")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    activeResultsTab === "matches"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Matches ({summary.matchedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResultsTab("orphan_s1")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    activeResultsTab === "orphan_s1"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Source 1 Orphans (Missing in PostgreSQL) ({summary.orphanSource1Count})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResultsTab("orphan_s2")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    activeResultsTab === "orphan_s2"
                      ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Source 2 Orphans (Missing in Normal Dataset) ({summary.orphanSource2Count})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResultsTab("duplicates")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    activeResultsTab === "duplicates"
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Duplicates ({summary.duplicateCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResultsTab("quality")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    activeResultsTab === "quality"
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Quality Engine
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1 rounded-md border border-input bg-background text-xs w-48 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                {activeResultsTab === "mismatches" && (
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={onlyDiffs}
                      onChange={(e) => setOnlyDiffs(e.target.checked)}
                      className="rounded border-input text-blue-600"
                    />
                    <span>Highlight only differing fields</span>
                  </label>
                )}
              </div>
            </div>

            {/* Tab: Mismatches Table */}
            {activeResultsTab === "mismatches" && (
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Record Key</th>
                      <th className="py-2.5 px-4">Field</th>
                      <th className="py-2.5 px-4 text-blue-400">Source 1 (Normal Dataset)</th>
                      <th className="py-2.5 px-4 text-[#4193d5]">Source 2 (PostgreSQL Dataset)</th>
                      <th className="py-2.5 px-4">Discrepancy Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {results
                      .filter((r) => r.status === "mismatched")
                      .filter((r) => {
                        if (!searchQuery) return true;
                        return (
                          r.recordKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          JSON.stringify(r.source1Record).toLowerCase().includes(searchQuery.toLowerCase())
                        );
                      })
                      .flatMap((r) =>
                        r.differences
                          .filter((d) => (onlyDiffs ? d.status === "mismatch" : true))
                          .map((d, dIdx) => (
                            <tr key={`${r.id}-${d.field}-${dIdx}`} className="hover:bg-muted/20 transition-colors">
                              <td className="py-2 px-4 font-mono font-medium flex items-center gap-1.5">
                                <span>{r.recordKey}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(r.recordKey);
                                    setCopiedKey(r.recordKey);
                                    setTimeout(() => setCopiedKey(null), 1500);
                                  }}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  {copiedKey === r.recordKey ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                </button>
                              </td>
                              <td className="py-2 px-4 font-mono">{d.field}</td>
                              <td className="py-2 px-4 font-mono text-rose-400">
                                {formatDisplayVal(d.source1Value)}
                              </td>
                              <td className="py-2 px-4 font-mono text-blue-400">
                                {formatDisplayVal(d.source2Value)}
                              </td>
                              <td className="py-2 px-4">
                                {d.status === "mismatch" ? (
                                  <Badge variant="outline" className="text-[10px] text-rose-400 border-rose-500/30 bg-rose-500/10">
                                    {d.reason || "Mismatch"}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                                    MATCH
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          )),
                      )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab: Matches Table */}
            {activeResultsTab === "matches" && (
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Record Key</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Matched Columns</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {results
                      .filter((r) => r.status === "matched")
                      .slice(0, 100)
                      .map((r) => (
                        <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2 px-4 font-mono font-medium">{r.recordKey}</td>
                          <td className="py-2 px-4">
                            <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                              PERFECT MATCH
                            </Badge>
                          </td>
                          <td className="py-2 px-4 text-muted-foreground font-mono text-[11px]">
                            {r.differences.map((d) => d.field).join(", ")}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab: Source 1 Orphans */}
            {activeResultsTab === "orphan_s1" && (
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Record Key</th>
                      <th className="py-2.5 px-4">Record Details (Source 1)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {results
                      .filter((r) => r.status === "orphan_source1")
                      .map((r) => (
                        <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2 px-4 font-mono font-medium text-amber-400">{r.recordKey}</td>
                          <td className="py-2 px-4 font-mono text-[11px] text-muted-foreground">
                            {JSON.stringify(r.source1Record)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab: Source 2 Orphans */}
            {activeResultsTab === "orphan_s2" && (
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Record Key</th>
                      <th className="py-2.5 px-4">Record Details (Source 2)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {results
                      .filter((r) => r.status === "orphan_source2")
                      .map((r) => (
                        <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2 px-4 font-mono font-medium text-indigo-400">{r.recordKey}</td>
                          <td className="py-2 px-4 font-mono text-[11px] text-muted-foreground">
                            {JSON.stringify(r.source2Record)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab: Duplicates */}
            {activeResultsTab === "duplicates" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Records with duplicate primary keys identified independently within each source dataset.
                </p>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">Dataset Source</th>
                        <th className="py-2.5 px-4">Duplicate Key</th>
                        <th className="py-2.5 px-4">Total Occurrences</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {summary.duplicateGroups.map((dg, i) => (
                        <tr key={`${dg.source}-${dg.key}-${i}`} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2 px-4 font-semibold uppercase text-purple-400 font-mono text-[10px]">
                            {dg.source}
                          </td>
                          <td className="py-2 px-4 font-mono">{dg.key}</td>
                          <td className="py-2 px-4 font-bold">{dg.occurrences}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: Quality Engine */}
            {activeResultsTab === "quality" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl bg-background border border-border text-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">Completeness</span>
                    <div className="text-lg font-bold text-foreground mt-0.5">{summary.qualityBreakdown.completeness}%</div>
                  </div>
                  <div className="p-4 rounded-xl bg-background border border-border text-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">Uniqueness</span>
                    <div className="text-lg font-bold text-foreground mt-0.5">{summary.qualityBreakdown.uniqueness}%</div>
                  </div>
                  <div className="p-4 rounded-xl bg-background border border-border text-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">Validity</span>
                    <div className="text-lg font-bold text-foreground mt-0.5">{summary.qualityBreakdown.validity}%</div>
                  </div>
                  <div className="p-4 rounded-xl bg-background border border-border text-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">Consistency</span>
                    <div className="text-lg font-bold text-foreground mt-0.5">{summary.qualityBreakdown.consistency}%</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">Issues & Discrepancy Breakdown</h4>
                  {summary.qualityBreakdown.issuesDetected.length === 0 ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                      No critical quality issues detected between datasets.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {summary.qualityBreakdown.issuesDetected.map((issue, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-background border border-border flex items-start gap-2.5 text-xs">
                          <span
                            className={`p-1 rounded-md shrink-0 mt-0.5 ${
                              issue.severity === "high"
                                ? "bg-rose-500/20 text-rose-400"
                                : issue.severity === "medium"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            <AlertCircle className="h-3.5 w-3.5" />
                          </span>
                          <div className="flex-1">
                            <span className="font-medium text-foreground">{issue.description}</span>
                            {issue.affectedColumn && (
                              <span className="text-muted-foreground ml-1 font-mono text-[11px]">({issue.affectedColumn})</span>
                            )}
                          </div>
                          <Badge variant="outline" className="text-[9px] uppercase font-mono">
                            {issue.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={() => setCurrentStep(4)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Reconfigure Rules
            </Button>
            <Button onClick={() => setCurrentStep(7)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Download className="h-4 w-4" /> Export Report & Automation
            </Button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          STEP 7: EXPORT REPORT & AUTOMATION
      ────────────────────────────────────────────────────────────────────────── */}
      {currentStep === 7 && summary && (
        <div className="space-y-6">
          <div className="stitch-card p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Download className="h-4 w-4 text-emerald-500" />
                Export Comparison Reports
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generate professional audit workbooks with executive summaries, reconciliation tables, and quality ratings.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Excel Download Card */}
              <div className="p-5 rounded-2xl bg-background border border-border hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <FileSpreadsheet className="h-5 w-5" />
                    <h4 className="font-semibold text-foreground text-sm">Excel Workbook (.xlsx)</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Multi-tab spreadsheet with Summary, Matches, Mismatches, Orphans, Duplicates, and Data Quality sheets.
                  </p>
                </div>
                <Button
                  onClick={() => handleExport("xlsx")}
                  disabled={exporting !== null}
                  className="w-full gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Download className="h-3.5 w-3.5" />
                  {exporting === "xlsx" ? "Generating..." : "Download Excel"}
                </Button>
              </div>

              {/* Interactive HTML Card */}
              <div className="p-5 rounded-2xl bg-background border border-border hover:border-blue-500/40 transition-all flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-blue-500">
                    <FileCode className="h-5 w-5" />
                    <h4 className="font-semibold text-foreground text-sm">Interactive HTML (.html)</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Standalone, responsive HTML report with searchable discrepancy tables and executive metrics.
                  </p>
                </div>
                <Button
                  onClick={() => handleExport("html")}
                  disabled={exporting !== null}
                  variant="outline"
                  className="w-full gap-2 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                >
                  <Download className="h-3.5 w-3.5" />
                  {exporting === "html" ? "Generating..." : "Download HTML"}
                </Button>
              </div>

              {/* PDF Card */}
              <div className="p-5 rounded-2xl bg-background border border-border hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-purple-400">
                    <FileText className="h-5 w-5" />
                    <h4 className="font-semibold text-foreground text-sm">Executive PDF (.pdf)</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Compact executive discrepancy brief ready for distribution and compliance signing.
                  </p>
                </div>
                <Button
                  onClick={() => handleExport("pdf")}
                  disabled={exporting !== null}
                  variant="outline"
                  className="w-full gap-2 text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                >
                  <Download className="h-3.5 w-3.5" />
                  {exporting === "pdf" ? "Generating..." : "Download PDF"}
                </Button>
              </div>
            </div>
          </div>

          {/* Save As Reusable Schedule */}
          <div className="stitch-card p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                Automated Scheduling & Reusable Configuration
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Save this comparison configuration to automatically run on recurring schedules (e.g. daily reconciliation).
              </p>
            </div>

            {scheduleSaved ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Scheduled comparison saved successfully. It will automatically run according to your schedule.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block mb-1 text-muted-foreground font-medium">Job Name</label>
                  <input
                    type="text"
                    value={scheduleName}
                    onChange={(e) => setScheduleName(e.target.value)}
                    placeholder="e.g. Daily Order Reconciliation"
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-muted-foreground font-medium">Schedule (Cron)</label>
                  <select
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono"
                  >
                    <option value="0 0 * * *">Daily at midnight (0 0 * * *)</option>
                    <option value="0 */6 * * *">Every 6 hours (0 */6 * * *)</option>
                    <option value="0 9 * * 1">Weekly on Monday (0 9 * * 1)</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleSaveSchedule} disabled={!scheduleName} className="w-full text-xs">
                    Save Schedule
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={() => setCurrentStep(6)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Review
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSource1(null);
                setSource2(null);
                setSummary(null);
                setResults([]);
                setJobId(`job_${Date.now()}`);
                setCurrentStep(1);
              }}
              className="gap-2"
            >
              Start New Comparison
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
