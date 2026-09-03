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

export default function PrepPage() {
  const router = useRouter();
  const [sources, setSources] = useState<any[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
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

  const [loading, setLoading] = useState(true);
  const [inferring, setInferring] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/sources");
        const data = await res.json();
        if (res.ok) {
          setSources(data.sources || []);
          if (data.sources?.length >= 2) {
            setSelectedSourceIds([data.sources[0].id, data.sources[1].id]);
          } else if (data.sources?.length === 1) {
            setSelectedSourceIds([data.sources[0].id]);
          }
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
    </div>
  );
}
