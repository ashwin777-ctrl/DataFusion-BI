"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Database,
  FileSpreadsheet,
  RefreshCw,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Server,
  Layers,
  FileCheck,
  GitCompare,
  ArrowRight,
} from "lucide-react";
import { clientCache } from "@/lib/cache/client-cache";
import { DataIngestionFlow } from "@/components/visuals/data-ingestion-flow";
import { AnalyticalEmptyState } from "@/components/visuals/analytical-empty-state";

interface SourceItem {
  id: string;
  alias: string;
  kind: "excel_sheet" | "pg_table";
  sheetName?: string;
  tableName?: string;
  rowCount: number | null;
  parquetBytes: number | null;
  profiledAt: string | null;
  createdAt: string;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceItem[]>(() => clientCache.sources || []);
  const [loading, setLoading] = useState(!clientCache.sources);
  const [uploading, setUploading] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // PostgreSQL Modal state with sensible defaults for the dev cluster
  const [showPgModal, setShowPgModal] = useState(false);
  const [pgInputMode, setPgInputMode] = useState<"fields" | "uri">("fields");
  const [pgUri, setPgUri] = useState("postgres://bi_app:bi_app_pw@127.0.0.1:5434/bi_platform");
  const [pgHost, setPgHost] = useState("127.0.0.1");
  const [pgPort, setPgPort] = useState("5434");
  const [pgDatabase, setPgDatabase] = useState("bi_platform");
  const [pgUser, setPgUser] = useState("bi_app");
  const [pgPassword, setPgPassword] = useState("bi_app_pw");
  const [pgSsl, setPgSsl] = useState(false);
  const [testingPg, setTestingPg] = useState(false);
  const [pgModalError, setPgModalError] = useState<string | null>(null);
  const [pgModalSuccess, setPgModalSuccess] = useState<string | null>(null);
  const [pgTables, setPgTables] = useState<Array<{ tableSchema: string; tableName: string; estimatedRows: number }>>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [syncingTable, setSyncingTable] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function applyPgUri(raw: string) {
    setPgUri(raw);
    if (!raw.trim()) return;
    try {
      let trimmed = raw.trim();
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        trimmed = trimmed.slice(1, -1).trim();
      }
      if (!trimmed.startsWith("postgres://") && !trimmed.startsWith("postgresql://")) {
        trimmed = "postgres://" + trimmed;
      }
      const u = new URL(trimmed);
      if (u.hostname) setPgHost(u.hostname);
      if (u.port) setPgPort(u.port);
      const db = u.pathname.replace(/^\//, "");
      if (db) setPgDatabase(decodeURIComponent(db));
      if (u.username) setPgUser(decodeURIComponent(u.username));
      if (u.password) setPgPassword(decodeURIComponent(u.password));
      const sslMode = u.searchParams.get("sslmode");
      if (sslMode) {
        setPgSsl(sslMode !== "disable");
      } else {
        const isLocal = u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "::1";
        setPgSsl(!isLocal);
      }
      setPgModalError(null);
    } catch {
      // ignore parse errors while typing
    }
  }

  function applyPreset(preset: "dev" | "local" | "cloud") {
    setPgModalError(null);
    setPgModalSuccess(null);
    if (preset === "dev") {
      setPgHost("127.0.0.1");
      setPgPort("5434");
      setPgDatabase("bi_platform");
      setPgUser("bi_app");
      setPgPassword("bi_app_pw");
      setPgSsl(false);
      setPgUri("postgres://bi_app:bi_app_pw@127.0.0.1:5434/bi_platform");
    } else if (preset === "local") {
      setPgHost("127.0.0.1");
      setPgPort("5432");
      setPgDatabase("postgres");
      setPgUser("postgres");
      setPgPassword("");
      setPgSsl(false);
      setPgUri("postgres://postgres@127.0.0.1:5432/postgres");
    } else if (preset === "cloud") {
      setPgHost("");
      setPgPort("5432");
      setPgDatabase("postgres");
      setPgUser("postgres");
      setPgPassword("");
      setPgSsl(true);
      setPgUri("");
    }
  }

  async function loadSources() {
    try {
      if (!clientCache.sources) {
        setLoading(true);
      }
      const res = await fetch("/api/sources");
      const data = await res.json();
      if (res.ok) {
        const list = data.sources || [];
        clientCache.sources = list;
        setSources(list);
      } else {
        setError(data.error || "Failed to load sources");
      }
    } catch {
      setError("Network error loading sources");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSources();
    if (typeof window !== "undefined") {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (isLocal) {
        setPgHost((prev) => prev || "127.0.0.1");
        setPgSsl(false);
      } else {
        setPgSsl(true);
      }
    }
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "tsv", "xls", "xlsx"].includes(ext || "")) {
      setError("Only CSV, TSV, XLS, and XLSX files are supported.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccessMsg(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/sources/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Successfully uploaded and profiled "${file.name}" (${data.profile.rowCount.toLocaleString()} rows).`);
        await loadSources();
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleLoadSample() {
    try {
      setLoadingSample(true);
      setError(null);
      setSuccessMsg(null);

      const res = await fetch("/api/sources/sample", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg("Loaded 4 sample enterprise sheets (Orders, Targets, Products, Customers) and created consolidated dataset.");
        await loadSources();
      } else {
        setError(data.error || "Failed to load sample dataset");
      }
    } catch {
      setError("Error loading sample dataset");
    } finally {
      setLoadingSample(false);
    }
  }

  async function handleDeleteSource(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete source "${name}"?`)) return;

    try {
      const res = await fetch(`/api/sources/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSources((prev) => {
          const next = prev.filter((s) => s.id !== id);
          clientCache.sources = next;
          return next;
        });
      }
    } catch {
      setError("Failed to delete source");
    }
  }

  function resolveEffectivePgConfig(): { error?: string; config?: { connectionString?: string; host: string; port: number; database: string; user: string; password: string; ssl: boolean } } {
    let host = pgHost.trim();
    let port = Number(pgPort) || 5434;
    let database = pgDatabase.trim();
    let user = pgUser.trim();
    let password = pgPassword;
    let ssl = pgSsl;

    if (pgInputMode === "uri" || (pgUri.trim() && !host)) {
      const uri = pgUri.trim();
      if (!uri) {
        return { error: "Please enter your PostgreSQL connection URI (e.g. postgres://user:password@host:port/dbname)." };
      }
      try {
        let trimmed = uri;
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
          trimmed = trimmed.slice(1, -1).trim();
        }
        if (!trimmed.startsWith("postgres://") && !trimmed.startsWith("postgresql://")) {
          trimmed = "postgres://" + trimmed;
        }
        const u = new URL(trimmed);
        if (u.hostname) host = u.hostname;
        if (u.port) port = Number(u.port);
        const db = u.pathname.replace(/^\//, "");
        if (db) database = decodeURIComponent(db);
        if (u.username) user = decodeURIComponent(u.username);
        if (u.password) password = decodeURIComponent(u.password);
        const sslMode = u.searchParams.get("sslmode");
        if (sslMode) {
          ssl = sslMode !== "disable";
        }
      } catch {
        return { error: "Could not parse PostgreSQL connection URI. Please verify the URL format." };
      }
    }

    // Auto-split host:port if user entered host as "127.0.0.1:5434"
    if (host.includes(":") && !host.includes("[")) {
      const parts = host.split(":");
      host = parts[0] || "127.0.0.1";
      if (parts[1] && !isNaN(Number(parts[1]))) {
        port = Number(parts[1]);
      }
    }

    if (!host) {
      return { error: "Please provide the database host address (e.g. 127.0.0.1, localhost, or cloud hostname)." };
    }
    if (!database) {
      return { error: "Please provide the database name (e.g. bi_platform or postgres)." };
    }
    if (!user) {
      return { error: "Please provide the database username (e.g. bi_app or postgres)." };
    }

    return {
      config: {
        connectionString: pgInputMode === "uri" ? pgUri.trim() : undefined,
        host,
        port,
        database,
        user,
        password,
        ssl,
      },
    };
  }

  async function handleTestPg() {
    setPgModalError(null);
    setPgModalSuccess(null);

    const resolved = resolveEffectivePgConfig();
    if (resolved.error || !resolved.config) {
      setPgModalError(resolved.error || "Invalid database connection settings.");
      return;
    }

    const payload = resolved.config;

    try {
      setTestingPg(true);

      const res = await fetch("/api/sources/postgres/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setPgModalSuccess(`PostgreSQL connection verified (${data.version || "Online"}). Fetching schemas...`);
        // Fetch tables
        const tblRes = await fetch("/api/sources/postgres/tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const tblData = await tblRes.json();
        if (tblRes.ok && tblData.tables) {
          setPgTables(tblData.tables);
          if (tblData.tables.length > 0 && tblData.tables[0]) {
            setSelectedTable(`${tblData.tables[0].tableSchema}.${tblData.tables[0].tableName}`);
          }
          setPgModalSuccess(`Connected to ${payload.host}:${payload.port}/${payload.database}! Found ${tblData.tables.length} table${tblData.tables.length === 1 ? "" : "s"}. Select a table below to ingest.`);
        } else {
          setPgModalError(tblData.error || "Connected, but failed to fetch tables.");
        }
      } else {
        setPgModalError(data.error || "Connection failed. Please check host, port, credentials, and SSL settings.");
      }
    } catch (err: any) {
      setPgModalError(err.message || "Failed to test PostgreSQL connection. Please verify your network and server status.");
    } finally {
      setTestingPg(false);
    }
  }

  async function handleSyncPgTable() {
    if (!selectedTable) return;
    const [tableSchema, tableName] = selectedTable.split(".");
    if (!tableSchema || !tableName) return;

    const resolved = resolveEffectivePgConfig();
    if (resolved.error || !resolved.config) {
      setPgModalError(resolved.error || "Invalid database configuration");
      return;
    }

    try {
      setSyncingTable(true);
      setPgModalError(null);

      const res = await fetch("/api/sources/postgres/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...resolved.config,
          tableSchema,
          tableName,
          limit: 100000,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Extracted and profiled table "${selectedTable}" (${data.profile.rowCount.toLocaleString()} rows).`);
        setShowPgModal(false);
        await loadSources();
      } else {
        setPgModalError(data.error || "Failed to extract table.");
      }
    } catch {
      setPgModalError("Error syncing table. Please check server logs.");
    } finally {
      setSyncingTable(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Explicit Distinction: Data Sources Hub vs Dedicated Data Compare */}
      <div className="rounded-2xl border-2 border-blue-500/40 bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-transparent p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start md:items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
            <GitCompare className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-foreground">
                Looking for Two-Dataset Comparison?
              </h4>
              <Badge className="text-[10px] bg-blue-600 text-white hover:bg-blue-600 font-semibold uppercase tracking-wider">
                SEPARATE WORKFLOW
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
              This page manages general persistent data sources. To compare two independent datasets (Source 1 Uploaded Data vs Source 2 PostgreSQL Dataset Export) with automatic reconciliation, use the dedicated Data Compare Studio. No live database connection required.
            </p>
          </div>
        </div>
        <Link href="/app/compare" className="shrink-0">
          <Button size="sm" className="gap-2 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md px-4 h-9">
            <GitCompare className="h-4 w-4" /> Go to Data Compare Studio <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Data Sources Hub</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect PostgreSQL databases or upload Excel (.xlsx, .xls) and CSV files for automated profiling and consolidation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadSample}
            disabled={loadingSample}
            className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            {loadingSample ? "Loading Demo..." : "Load Sample Enterprise Dataset"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowPgModal(true);
              setPgModalError(null);
              setPgModalSuccess(null);
              if (error?.toLowerCase().includes("host") || error?.toLowerCase().includes("postgres")) {
                setError(null);
              }
            }}
            className="gap-1.5"
          >
            <Database className="h-4 w-4 text-blue-500" />
            Connect PostgreSQL
          </Button>

          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-1.5"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Profiling..." : "Upload Excel / CSV"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.tsv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs font-semibold px-2 py-1 rounded bg-destructive/20 hover:bg-destructive/30 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Visual Data Ingestion Architecture Flow */}
      <DataIngestionFlow />

      {/* Quick Upload Drop Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="group relative flex cursor-pointer flex-col items-center justify-center p-8 rounded-[20px] bg-white dark:bg-[#151518] border-2 border-dashed border-[#0071E3]/30 hover:border-[#0071E3] text-center transition-all shadow-sm hover:shadow-md"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#0071E3]/10 text-[#0071E3] dark:text-[#0A84FF] transition-transform group-hover:scale-110 shadow-sm">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Upload Spreadsheet or Data Table</h3>
        <p className="mt-1 text-xs text-[#86868B] max-w-sm">
          Drag & drop Excel (.xlsx, .xls) or CSV/TSV files up to 100 MB. Automated column type inference and Parquet conversion.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] border-[#0071E3]/30 text-[#0071E3] dark:text-[#0A84FF] bg-[#0071E3]/5">.xlsx</Badge>
          <Badge variant="outline" className="text-[11px] border-[#0071E3]/30 text-[#0071E3] dark:text-[#0A84FF] bg-[#0071E3]/5">.xls</Badge>
          <Badge variant="outline" className="text-[11px] border-[#0071E3]/30 text-[#0071E3] dark:text-[#0A84FF] bg-[#0071E3]/5">.csv</Badge>
          <Badge variant="outline" className="text-[11px] border-[#34C759]/30 text-[#34C759] bg-[#34C759]/5">Multi-sheet</Badge>
        </div>
      </div>

      {/* Sources Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#0071E3]" />
            Configured Sources ({sources.length})
          </h2>
          <Button variant="ghost" size="sm" onClick={loadSources} className="gap-1 text-xs text-[#86868B] hover:text-[#0071E3]">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-[18px] bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] animate-pulse" />
            ))}
          </div>
        ) : sources.length === 0 ? (
          <AnalyticalEmptyState
            type="datasets"
            title="No Data Sources Connected Yet"
            description="Upload an Excel workbook or load the sample enterprise dataset to initiate automatic schema extraction."
            actionText="Upload File"
            onAction={() => fileInputRef.current?.click()}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sources.map((src) => {
              const isPg = src.kind === "pg_table";
              const sizeKb = src.parquetBytes ? (src.parquetBytes / 1024).toFixed(1) : "—";

              return (
                <div key={src.id} className="stitch-card p-5 group flex flex-col justify-between hover:border-cyan-500/40 transition-all">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-2 rounded-lg ${isPg ? "bg-blue-500/15 text-cyan-400 border border-cyan-500/20" : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"}`}>
                          {isPg ? <Database className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base truncate font-semibold text-foreground group-hover:text-cyan-400 transition-colors">
                            {src.alias}
                          </h3>
                          <p className="text-xs truncate text-muted-foreground font-mono">
                            {isPg ? `Table: ${src.tableName}` : `Sheet: ${src.sheetName || "Default"}`}
                          </p>
                        </div>
                      </div>

                      <Badge variant={isPg ? "info" : "success"} className="text-[10px] uppercase font-mono tracking-wider shrink-0">
                        {isPg ? "PostgreSQL" : "Excel/CSV"}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-5 pt-0 space-y-3">
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Rows</span>
                        <span className="font-semibold text-foreground text-sm">
                          {src.rowCount !== null ? src.rowCount.toLocaleString() : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Staged Parquet</span>
                        <span className="font-semibold text-foreground text-sm">{sizeKb} KB</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                      <span className="text-muted-foreground text-[11px]">
                        {new Date(src.createdAt).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-1">
                        <Link href={`/app/sources/${src.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-accent">
                            <ExternalLink className="h-3 w-3" />
                            Profile
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSource(src.id, src.alias)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PostgreSQL Modal */}
      {showPgModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPgModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
        >
          <div className="w-full max-w-lg stitch-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-foreground">Connect PostgreSQL Database</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPgModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm p-1"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Connect to your PostgreSQL instance in read-only mode. We discover schemas and tables you select, stage them into Parquet, and never modify your remote data.
            </p>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1">Quick Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset("dev")}
                className="text-[11px] px-2.5 py-1 rounded-md border border-purple-500/40 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 transition-colors font-semibold"
              >
                Local Dev Cluster (5434) ★
              </button>
              <button
                type="button"
                onClick={() => applyPreset("local")}
                className="text-[11px] px-2.5 py-1 rounded-md border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors font-medium"
              >
                Standard Localhost (5432)
              </button>
              <button
                type="button"
                onClick={() => applyPreset("cloud")}
                className="text-[11px] px-2.5 py-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors font-medium"
              >
                Cloud (Supabase / Neon)
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-border text-xs font-medium gap-2">
              <button
                type="button"
                onClick={() => setPgInputMode("fields")}
                className={`pb-2 px-3 border-b-2 transition-colors ${
                  pgInputMode === "fields"
                    ? "border-cyan-500 text-cyan-400 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Individual Fields
              </button>
              <button
                type="button"
                onClick={() => setPgInputMode("uri")}
                className={`pb-2 px-3 border-b-2 transition-colors ${
                  pgInputMode === "uri"
                    ? "border-cyan-500 text-cyan-400 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Connection String (URI)
              </button>
            </div>

            {/* Connection String Mode */}
            {pgInputMode === "uri" && (
              <div className="space-y-2 text-xs">
                <label htmlFor="pgUri" className="font-medium text-foreground block">
                  PostgreSQL Connection URI
                </label>
                <textarea
                  id="pgUri"
                  rows={3}
                  value={pgUri}
                  onChange={(e) => applyPgUri(e.target.value)}
                  placeholder="postgresql://user:password@aws-0.pooler.supabase.com:6543/postgres?sslmode=require"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono resize-none focus:border-cyan-500 focus:outline-none"
                />
                <p className="text-[11px] text-muted-foreground">
                  Paste your connection URL from Supabase, Neon, AWS RDS, or Docker. It automatically populates the host, port, credentials, and SSL settings.
                </p>
              </div>
            )}

            {/* Fields Mode */}
            <div className={`grid grid-cols-2 gap-3 text-xs ${pgInputMode === "uri" ? "opacity-75 pt-1 border-t border-border" : ""}`}>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="pgHost" className="font-medium text-foreground">
                    Host Address <span className="text-destructive">*</span>
                  </label>
                  {!pgHost.trim() && (
                    <span className="text-[10px] text-destructive font-semibold">Required</span>
                  )}
                </div>
                <input
                  id="pgHost"
                  type="text"
                  value={pgHost}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith("postgres://") || val.startsWith("postgresql://")) {
                      applyPgUri(val);
                      return;
                    }
                    setPgHost(val);
                    if (pgModalError) setPgModalError(null);
                  }}
                  className={`w-full rounded-md border bg-background px-3 py-1.5 text-sm font-mono transition-colors ${
                    pgModalError && !pgHost.trim()
                      ? "border-destructive ring-1 ring-destructive"
                      : "border-input focus:border-cyan-500"
                  }`}
                  placeholder="e.g. 127.0.0.1 or aws-0.pooler.supabase.com"
                />
              </div>

              <div>
                <label htmlFor="pgPort" className="font-medium text-foreground block mb-1">Port</label>
                <input
                  id="pgPort"
                  type="text"
                  value={pgPort}
                  onChange={(e) => setPgPort(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono focus:border-cyan-500"
                  placeholder="5432 or 6543"
                />
              </div>

              <div>
                <label htmlFor="pgDatabase" className="font-medium text-foreground block mb-1">Database Name</label>
                <input
                  id="pgDatabase"
                  type="text"
                  value={pgDatabase}
                  onChange={(e) => setPgDatabase(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono focus:border-cyan-500"
                  placeholder="postgres"
                />
              </div>

              <div>
                <label htmlFor="pgUser" className="font-medium text-foreground block mb-1">Username</label>
                <input
                  id="pgUser"
                  type="text"
                  value={pgUser}
                  onChange={(e) => setPgUser(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono focus:border-cyan-500"
                  placeholder="postgres"
                />
              </div>

              <div className="col-span-2">
                <label htmlFor="pgPassword" className="font-medium text-foreground block mb-1">Password</label>
                <input
                  id="pgPassword"
                  type="password"
                  value={pgPassword}
                  onChange={(e) => setPgPassword(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono focus:border-cyan-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="col-span-2 flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pgSslToggle"
                  checked={pgSsl}
                  onChange={(e) => setPgSsl(e.target.checked)}
                  className="rounded border-input text-cyan-500 focus:ring-cyan-500 h-4 w-4"
                />
                <label htmlFor="pgSslToggle" className="text-xs text-muted-foreground cursor-pointer select-none">
                  Require SSL / TLS encryption (recommended for cloud databases; uncheck for local instances)
                </label>
              </div>
            </div>

            {/* In-Modal Alert Messages */}
            {pgModalError && (
              <div className="flex items-start justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in-50">
                <div className="flex items-start gap-2 min-w-0">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{pgModalError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPgModalError(null)}
                  className="text-destructive/70 hover:text-destructive text-xs font-bold px-1"
                >
                  ✕
                </button>
              </div>
            )}

            {pgModalSuccess && (
              <div className="flex items-start justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 animate-in fade-in-50">
                <div className="flex items-start gap-2 min-w-0">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{pgModalSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPgModalSuccess(null)}
                  className="text-emerald-400/70 hover:text-emerald-400 text-xs font-bold px-1"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestPg}
                disabled={testingPg}
                className="gap-1.5"
              >
                <Server className={`h-3.5 w-3.5 ${testingPg ? "animate-spin" : ""}`} />
                {testingPg ? "Testing Connection..." : "Test Connection & Fetch Tables"}
              </Button>

              {pgTables.length > 0 && (
                <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {pgTables.length} tables found
                </span>
              )}
            </div>

            {pgTables.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-xs font-semibold text-foreground block">Select Table to Ingest</label>
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-cyan-500"
                >
                  {pgTables.map((t) => (
                    <option key={`${t.tableSchema}.${t.tableName}`} value={`${t.tableSchema}.${t.tableName}`}>
                      {t.tableSchema}.{t.tableName} (~{t.estimatedRows.toLocaleString()} rows)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => setShowPgModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={pgTables.length === 0 || syncingTable}
                onClick={handleSyncPgTable}
                className="gap-1.5"
              >
                <FileCheck className="h-4 w-4" />
                {syncingTable ? "Ingesting Table..." : "Ingest & Profile Table"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
