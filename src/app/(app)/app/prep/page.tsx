"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Sparkles,
  Database,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Wand2,
  Trash2,
} from "lucide-react";
import { clientCache } from "@/lib/cache/client-cache";
import { DataModelVisualizer } from "@/components/visuals/data-model-visualizer";

export default function PrepPage() {
  const router = useRouter();
  const [sources, setSources] = useState<any[]>(() => clientCache.sources || []);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(() => {
    const list = clientCache.sources;
    if (list && list.length >= 2) return [list[0].id, list[1].id];
    if (list && list.length === 1) return [list[0].id];
    return [];
  });
  const [datasetName, setDatasetName] = useState("Consolidated Analytics Model");
  const [inferredJoins, setInferredJoins] = useState<any[]>([]);
  const [joins, setJoins] = useState<
    Array<{
      leftAlias: string;
      leftColumn: string;
      rightAlias: string;
      rightColumn: string;
      joinType: "inner" | "left" | "right" | "full" | "union";
    }>
  >([]);

  const [loading, setLoading] = useState(!clientCache.sources);
  const [inferring, setInferring] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Column hygiene & transformation state
  const [datasets, setDatasets] = useState<any[]>(() => clientCache.datasets || []);
  const [activeTransformDatasetId, setActiveTransformDatasetId] = useState<string | null>(
    () => clientCache.activeDatasetId || clientCache.datasets?.[0]?.id || null,
  );
  const [transformDetail, setTransformDetail] = useState<any>(null);
  const [transformLoading, setTransformLoading] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [transformAction, setTransformAction] = useState<"drop_nulls" | "fillna" | "rename" | "cast">("drop_nulls");
  const [newColumnName, setNewColumnName] = useState("");
  const [fillValue, setFillValue] = useState("");
  const [targetType, setTargetType] = useState<"VARCHAR" | "BIGINT" | "DOUBLE" | "DATE" | "TIMESTAMP" | "BOOLEAN">("VARCHAR");
  const [applyingTransform, setApplyingTransform] = useState(false);
  const [transformMsg, setTransformMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadDatasets() {
      try {
        const res = await fetch("/api/datasets");
        const data = await res.json();
        if (res.ok && data.datasets?.length > 0) {
          setDatasets(data.datasets);
          clientCache.datasets = data.datasets;
          if (!activeTransformDatasetId) {
            setActiveTransformDatasetId(data.datasets[0].id);
          }
        }
      } catch {}
    }
    loadDatasets();
  }, [activeTransformDatasetId]);

  useEffect(() => {
    if (!activeTransformDatasetId) return;
    async function loadDetail() {
      try {
        setTransformLoading(true);
        const res = await fetch(`/api/datasets/${activeTransformDatasetId}`);
        const data = await res.json();
        if (res.ok) {
          setTransformDetail(data);
          if (data.profile?.columns?.length > 0) {
            setSelectedColumn((prev: string) => prev || data.profile.columns[0].name);
          }
        }
      } catch {} finally {
        setTransformLoading(false);
      }
    }
    loadDetail();
  }, [activeTransformDatasetId]);

  async function handleApplyTransformation() {
    if (!activeTransformDatasetId || !selectedColumn) return;
    setApplyingTransform(true);
    setTransformMsg(null);
    try {
      const step: any = {
        id: `step_${Date.now()}`,
        action: transformAction,
        column: selectedColumn,
      };
      if (transformAction === "rename") {
        if (!newColumnName.trim()) {
          setTransformMsg({ type: "error", text: "New column name cannot be empty" });
          setApplyingTransform(false);
          return;
        }
        step.newColumnName = newColumnName.trim();
      } else if (transformAction === "fillna") {
        step.fillValue = fillValue;
      } else if (transformAction === "cast") {
        step.targetType = targetType;
      }

      const res = await fetch(`/api/datasets/${activeTransformDatasetId}/transform`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: [step] }),
      });
      const result = await res.json();
      if (res.ok) {
        setTransformMsg({
          type: "success",
          text: `Transformation applied successfully! Updated dataset now has ${result.rowCount?.toLocaleString()} rows.`,
        });
        // refresh detail
        const refRes = await fetch(`/api/datasets/${activeTransformDatasetId}`);
        const refData = await refRes.json();
        if (refRes.ok) {
          setTransformDetail(refData);
          clientCache.details[activeTransformDatasetId] = refData;
        }
      } else {
        setTransformMsg({ type: "error", text: result.error || "Transformation failed" });
      }
    } catch (err: any) {
      setTransformMsg({ type: "error", text: err.message || "Failed to execute transformation" });
    } finally {
      setApplyingTransform(false);
    }
  }

  useEffect(() => {
    async function load() {
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
          setSelectedSourceIds((prev) => {
            if (prev.length > 0) return prev;
            if (list.length >= 2) return [list[0].id, list[1].id];
            if (list.length === 1) return [list[0].id];
            return [];
          });
        }
      } catch {
        setError("Failed to load sources");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleInferRelationships() {
    if (selectedSourceIds.length < 2) {
      setError("Select at least 2 sources to infer joins");
      return;
    }

    try {
      setInferring(true);
      setError(null);
      const res = await fetch("/api/datasets/infer-joins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceIds: selectedSourceIds }),
      });

      const data = await res.json();
      if (res.ok) {
        setInferredJoins(data.relationships || []);
        if (data.relationships?.length > 0 && data.relationships[0]) {
          const first = data.relationships[0];
          setJoins([
            {
              leftAlias: first.sourceLeftName,
              leftColumn: first.columnLeft,
              rightAlias: first.sourceRightName,
              rightColumn: first.columnRight,
              joinType: "left",
            },
          ]);
          setSuccessMsg(`Inferred ${data.relationships.length} relationship match(es) with high confidence.`);
        } else {
          setSuccessMsg("No automatic key matches found. You can configure manual join keys below.");
        }
      } else {
        setError(data.error || "Inference failed");
      }
    } catch {
      setError("Error inferring relationships");
    } finally {
      setInferring(false);
    }
  }

  function toggleSourceSelection(id: string) {
    setSelectedSourceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleBuildDataset() {
    if (selectedSourceIds.length === 0) {
      setError("Please select at least one source table or sheet");
      return;
    }

    try {
      setBuilding(true);
      setError(null);

      const res = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: datasetName,
          sourceIds: selectedSourceIds,
          joins: joins,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push("/app");
      } else {
        setError(data.error || "Failed to build dataset");
      }
    } catch {
      setError("Error building consolidated dataset");
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Data Prep & Consolidation Model</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Merge and join Excel sheets and PostgreSQL tables into a unified analytical schema.
          </p>
        </div>

        <Button
          onClick={handleBuildDataset}
          disabled={building || selectedSourceIds.length === 0}
          className="gap-1.5"
        >
          <Sparkles className="h-4 w-4" />
          {building ? "Building Parquet Model..." : "Build Consolidated Dataset"}
        </Button>
      </div>

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

      {/* Model Name */}
      <div className="stitch-card p-5">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1">
          Consolidated Dataset Name
        </label>
        <input
          type="text"
          value={datasetName}
          onChange={(e) => setDatasetName(e.target.value)}
          className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold"
        />
      </div>

      {/* Interactive Relational Data Model Visualizer */}
      <DataModelVisualizer />

      {/* Step 1: Select Sources */}
      <div className="stitch-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">1. Select Sources to Consolidate</h2>
            <p className="text-xs text-muted-foreground">
              Choose the primary fact table/sheet and any dimension lookup tables.
            </p>
          </div>

          {selectedSourceIds.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleInferRelationships}
              disabled={inferring}
              className="gap-1.5 text-xs text-accent border-accent/30"
            >
              <Wand2 className="h-3.5 w-3.5" />
              {inferring ? "Analyzing Keys..." : "Auto-Detect Joins"}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="h-24 bg-muted animate-pulse rounded-lg" />
        ) : sources.length === 0 ? (
          <p className="text-xs text-muted-foreground p-4 bg-muted/30 rounded-lg text-center">
            No sources configured yet. <Link href="/app/sources" className="text-accent underline font-medium">Upload a file or connect Postgres</Link> first.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sources.map((src) => {
              const selected = selectedSourceIds.includes(src.id);
              const isPrimary = selectedSourceIds[0] === src.id;

              return (
                <div
                  key={src.id}
                  onClick={() => toggleSourceSelection(src.id)}
                  className={`cursor-pointer rounded-lg border p-4 transition-all ${
                    selected
                      ? "border-accent bg-accent/5 ring-1 ring-accent"
                      : "border-border bg-card hover:border-border-strong"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${src.kind === "pg_table" ? "bg-blue-500/10 text-blue-600" : "bg-emerald-500/10 text-emerald-600"}`}>
                        {src.kind === "pg_table" ? <Database className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-foreground block truncate">
                          {src.alias}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {src.rowCount?.toLocaleString()} rows
                        </span>
                      </div>
                    </div>

                    {isPrimary ? (
                      <Badge variant="default" className="text-[10px]">Primary Fact</Badge>
                    ) : selected ? (
                      <Badge variant="outline" className="text-[10px]">Dimension</Badge>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 2: Configure Joins */}
      {selectedSourceIds.length >= 2 && (
        <div className="stitch-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">2. Relationship & Join Definition</h2>
              <p className="text-xs text-muted-foreground">
                Define how tables map to one another (e.g. Orders.customer_id = Customers.customer_id).
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const s1 = sources.find((s) => s.id === selectedSourceIds[0]);
                const s2 = sources.find((s) => s.id === selectedSourceIds[1]);
                if (s1 && s2) {
                  setJoins([
                    ...joins,
                    {
                      leftAlias: s1.alias,
                      leftColumn: "id",
                      rightAlias: s2.alias,
                      rightColumn: "id",
                      joinType: "left",
                    },
                  ]);
                }
              }}
              className="gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Join Rule
            </Button>
          </div>

          {inferredJoins.length > 0 && (
            <div className="space-y-2 rounded-lg bg-accent/5 border border-accent/20 p-3 text-xs">
              <span className="font-semibold text-accent block">Inferred Relationships:</span>
              <ul className="space-y-1 text-muted-foreground">
                {inferredJoins.map((ij, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-2">
                    <span>
                      • <strong>{ij.sourceLeftName}.{ij.columnLeft}</strong> ⟷ <strong>{ij.sourceRightName}.{ij.columnRight}</strong> ({ij.cardinality} cardinality, {ij.overlapPercentage}% overlap)
                    </span>
                    <Badge variant={ij.isFanoutRisk ? "warning" : "success"} className="text-[10px]">
                      {ij.isFanoutRisk ? "Fan-out Risk" : "Safe Join"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {joins.length === 0 ? (
            <div className="text-xs text-muted-foreground p-4 bg-muted/20 rounded-lg text-center">
              Click &quot;Auto-Detect Joins&quot; or &quot;Add Join Rule&quot; to establish relationships.
            </div>
          ) : (
            <div className="space-y-3">
              {joins.map((j, idx) => {
                if (!j) return null;
                return (
                  <div key={idx} className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-card">
                    <input
                      type="text"
                      value={j.leftAlias}
                      onChange={(e) => {
                        const copy = [...joins];
                        if (copy[idx]) {
                          copy[idx].leftAlias = e.target.value;
                          setJoins(copy);
                        }
                      }}
                      className="w-28 rounded-md border border-input bg-background px-2 py-1 text-xs font-mono"
                      placeholder="Left table"
                    />
                    <span className="text-xs text-muted-foreground">.</span>
                    <input
                      type="text"
                      value={j.leftColumn}
                      onChange={(e) => {
                        const copy = [...joins];
                        if (copy[idx]) {
                          copy[idx].leftColumn = e.target.value;
                          setJoins(copy);
                        }
                      }}
                      className="w-32 rounded-md border border-input bg-background px-2 py-1 text-xs font-mono"
                      placeholder="Left column"
                    />

                    <select
                      value={j.joinType}
                      onChange={(e) => {
                        const copy = [...joins];
                        if (copy[idx]) {
                          copy[idx].joinType = e.target.value as any;
                          setJoins(copy);
                        }
                      }}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold uppercase text-accent"
                    >
                      <option value="left">LEFT JOIN</option>
                      <option value="inner">INNER JOIN</option>
                      <option value="right">RIGHT JOIN</option>
                      <option value="full">FULL JOIN</option>
                    </select>

                    <input
                      type="text"
                      value={j.rightAlias}
                      onChange={(e) => {
                        const copy = [...joins];
                        if (copy[idx]) {
                          copy[idx].rightAlias = e.target.value;
                          setJoins(copy);
                        }
                      }}
                      className="w-28 rounded-md border border-input bg-background px-2 py-1 text-xs font-mono"
                      placeholder="Right table"
                    />
                    <span className="text-xs text-muted-foreground">.</span>
                    <input
                      type="text"
                      value={j.rightColumn}
                      onChange={(e) => {
                        const copy = [...joins];
                        if (copy[idx]) {
                          copy[idx].rightColumn = e.target.value;
                          setJoins(copy);
                        }
                      }}
                      className="w-32 rounded-md border border-input bg-background px-2 py-1 text-xs font-mono"
                      placeholder="Right column"
                    />

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setJoins(joins.filter((_, i) => i !== idx))}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Column Hygiene & In-Place Transformations */}
      <div className="stitch-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs">
                3
              </span>
              <h2 className="text-base font-bold text-foreground">Column Hygiene & In-Place Transformations</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sanitize null values, cast columnar datatypes, and rename dimensions directly in the DuckDB Parquet storage engine.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Target Dataset:</span>
            <select
              value={activeTransformDatasetId || ""}
              onChange={(e) => setActiveTransformDatasetId(e.target.value)}
              className="rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-semibold text-foreground"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.rowCount?.toLocaleString()} rows)
                </option>
              ))}
            </select>
          </div>
        </div>

        {transformMsg && (
          <div
            className={`flex items-center gap-2 rounded-lg p-3 text-xs ${
              transformMsg.type === "success"
                ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border border-destructive/20 bg-destructive/10 text-destructive"
            }`}
          >
            {transformMsg.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{transformMsg.text}</span>
          </div>
        )}

        {transformLoading ? (
          <div className="h-32 bg-muted/40 animate-pulse rounded-xl" />
        ) : !transformDetail ? (
          <p className="text-xs text-muted-foreground">Select a dataset above to configure columnar transformations.</p>
        ) : (
          <div className="space-y-4">
            {/* Columns Schema Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Detected Column Schema ({transformDetail.profile?.columns?.length || 0} columns)
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  Total Rows: <strong className="text-foreground">{transformDetail.profile?.rowCount?.toLocaleString()}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {transformDetail.profile?.columns?.map((col: any) => (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => setSelectedColumn(col.name)}
                    className={`text-left p-2.5 rounded-xl border transition-all ${
                      selectedColumn === col.name
                        ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-500"
                        : "border-border bg-card/60 hover:border-border-strong"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-semibold text-foreground truncate block" title={col.name}>
                        {col.name}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                        {col.duckdbType}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex justify-between">
                      <span>Nulls: {col.nullCount ?? 0}</span>
                      <span>Card: {col.distinctCount ?? "—"}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Transformation Configuration Builder */}
            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Configure Transformation on Column: <strong className="text-indigo-600 dark:text-indigo-400">{selectedColumn || "None selected"}</strong>
              </span>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground font-semibold block mb-1">Operation</label>
                  <select
                    value={transformAction}
                    onChange={(e) => setTransformAction(e.target.value as any)}
                    className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs font-medium text-foreground"
                  >
                    <option value="drop_nulls">Drop Null Rows (IS NOT NULL)</option>
                    <option value="fillna">Fill Missing Values (COALESCE)</option>
                    <option value="rename">Rename Column</option>
                    <option value="cast">Cast Data Type</option>
                  </select>
                </div>

                {transformAction === "fillna" && (
                  <div>
                    <label className="text-[11px] text-muted-foreground font-semibold block mb-1">Replacement Value</label>
                    <input
                      type="text"
                      placeholder="e.g. 0 or 'N/A'"
                      value={fillValue}
                      onChange={(e) => setFillValue(e.target.value)}
                      className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs font-medium text-foreground font-mono"
                    />
                  </div>
                )}

                {transformAction === "rename" && (
                  <div>
                    <label className="text-[11px] text-muted-foreground font-semibold block mb-1">New Column Name</label>
                    <input
                      type="text"
                      placeholder="new_column_name"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs font-medium text-foreground font-mono"
                    />
                  </div>
                )}

                {transformAction === "cast" && (
                  <div>
                    <label className="text-[11px] text-muted-foreground font-semibold block mb-1">Target Type</label>
                    <select
                      value={targetType}
                      onChange={(e) => setTargetType(e.target.value as any)}
                      className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs font-medium text-foreground"
                    >
                      <option value="VARCHAR">VARCHAR (Text)</option>
                      <option value="BIGINT">BIGINT (Integer)</option>
                      <option value="DOUBLE">DOUBLE (Decimal)</option>
                      <option value="DATE">DATE</option>
                      <option value="TIMESTAMP">TIMESTAMP</option>
                      <option value="BOOLEAN">BOOLEAN</option>
                    </select>
                  </div>
                )}

                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={handleApplyTransformation}
                    disabled={applyingTransform || !selectedColumn}
                    className="w-full gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{applyingTransform ? "Executing in DuckDB..." : "Apply Transformation"}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
