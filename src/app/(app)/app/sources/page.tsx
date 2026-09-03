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
} from "lucide-react";

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
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // PostgreSQL Modal state
  const [showPgModal, setShowPgModal] = useState(false);
  const [pgHost, setPgHost] = useState("127.0.0.1");
  const [pgPort, setPgPort] = useState("5434");
  const [pgDatabase, setPgDatabase] = useState("bi_platform");
  const [pgUser, setPgUser] = useState("bi_app");
  const [pgPassword, setPgPassword] = useState("bi_app_pw");
  const [pgSsl] = useState(false);
  const [testingPg, setTestingPg] = useState(false);
  const [pgTables, setPgTables] = useState<Array<{ tableSchema: string; tableName: string; estimatedRows: number }>>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [syncingTable, setSyncingTable] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadSources() {
    try {
      setLoading(true);
      const res = await fetch("/api/sources");
      const data = await res.json();
      if (res.ok) {
        setSources(data.sources || []);
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
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

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
        setSources((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      setError("Failed to delete source");
    }
  }

  async function handleTestPg() {
    try {
      setTestingPg(true);
      setError(null);

      const res = await fetch("/api/sources/postgres/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: pgHost,
          port: Number(pgPort),
          database: pgDatabase,
          user: pgUser,
          password: pgPassword,
          ssl: pgSsl,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setSuccessMsg(`PostgreSQL connection verified (${data.version || "Online"}). Fetching tables...`);
        // Fetch tables
        const tblRes = await fetch("/api/sources/postgres/tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            host: pgHost,
            port: Number(pgPort),
            database: pgDatabase,
            user: pgUser,
            password: pgPassword,
            ssl: pgSsl,
          }),
        });
        const tblData = await tblRes.json();
        if (tblRes.ok) {
          setPgTables(tblData.tables || []);
          if (tblData.tables?.length > 0 && tblData.tables[0]) {
            setSelectedTable(`${tblData.tables[0].tableSchema}.${tblData.tables[0].tableName}`);
          }
        }
      } else {
        setError(data.error || "Connection failed");
      }
    } catch {
      setError("Failed to test PostgreSQL connection");
    } finally {
      setTestingPg(false);
    }
  }

  async function handleSyncPgTable() {
    if (!selectedTable) return;
    const [tableSchema, tableName] = selectedTable.split(".");
    if (!tableSchema || !tableName) return;

    try {
      setSyncingTable(true);
      setError(null);

      const res = await fetch("/api/sources/postgres/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: pgHost,
          port: Number(pgPort),
          database: pgDatabase,
          user: pgUser,
          password: pgPassword,
          ssl: pgSsl,
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
        setError(data.error || "Failed to extract table");
      }
    } catch {
      setError("Error syncing table");
    } finally {
      setSyncingTable(false);
    }
  }

  return (
    <div className="space-y-6">
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
            onClick={() => setShowPgModal(true)}
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
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Upload Drop Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="group relative flex cursor-pointer flex-col items-center justify-center stitch-card border-2 border-dashed border-cyan-500/30 p-8 text-center transition-all hover:border-cyan-400/60 hover:shadow-[0_0_24px_rgba(56,189,248,0.15)]"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 transition-transform group-hover:scale-110 shadow-sm">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-base font-semibold text-foreground">Upload Spreadsheet or Data Table</h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          Drag & drop Excel (.xlsx, .xls) or CSV/TSV files up to 100 MB. We automatically detect column types, dates, measures, and statistics.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] border-cyan-500/30 text-cyan-400 bg-cyan-500/5">.xlsx</Badge>
          <Badge variant="outline" className="text-[11px] border-cyan-500/30 text-cyan-400 bg-cyan-500/5">.xls</Badge>
          <Badge variant="outline" className="text-[11px] border-cyan-500/30 text-cyan-400 bg-cyan-500/5">.csv</Badge>
          <Badge variant="outline" className="text-[11px] border-emerald-500/30 text-emerald-400 bg-emerald-500/5">Multi-sheet</Badge>
        </div>
      </div>

      {/* Sources Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-cyan-400" />
            Configured Sources ({sources.length})
          </h2>
          <Button variant="ghost" size="sm" onClick={loadSources} className="gap-1 text-xs text-muted-foreground hover:text-cyan-400">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 stitch-card animate-pulse" />
            ))}
          </div>
        ) : sources.length === 0 ? (
          <div className="stitch-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No data sources connected yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload an Excel workbook or click &quot;Load Sample Enterprise Dataset&quot; to test.
            </p>
          </div>
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
          <div className="w-full max-w-lg stitch-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-foreground">Connect PostgreSQL Database</h3>
              </div>
              <button
                onClick={() => setShowPgModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Connect to your PostgreSQL instance in read-only mode. We pull only the schemas and tables you choose, stage them into Parquet, and never write back.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-medium text-foreground block mb-1">Host</label>
                <input
                  type="text"
                  value={pgHost}
                  onChange={(e) => setPgHost(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  placeholder="127.0.0.1 or db.example.com"
                />
              </div>
              <div>
                <label className="font-medium text-foreground block mb-1">Port</label>
                <input
                  type="text"
                  value={pgPort}
                  onChange={(e) => setPgPort(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  placeholder="5432 or 5434"
                />
              </div>
              <div>
                <label className="font-medium text-foreground block mb-1">Database Name</label>
                <input
                  type="text"
                  value={pgDatabase}
                  onChange={(e) => setPgDatabase(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="font-medium text-foreground block mb-1">Username</label>
                <input
                  type="text"
                  value={pgUser}
                  onChange={(e) => setPgUser(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="font-medium text-foreground block mb-1">Password</label>
                <input
                  type="password"
                  value={pgPassword}
                  onChange={(e) => setPgPassword(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestPg}
                disabled={testingPg}
                className="gap-1.5"
              >
                <Server className="h-3.5 w-3.5" />
                {testingPg ? "Testing..." : "Test Connection & Fetch Tables"}
              </Button>

              {pgTables.length > 0 && (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
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
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
