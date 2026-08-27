"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Table as TableIcon,
  Layers,
  Sparkles,
} from "lucide-react";

interface ColumnProfileItem {
  id: string;
  ordinal: number;
  rawName: string;
  normalizedName: string;
  storageType: string;
  semanticRole: string;
  semanticSubtype: string | null;
  nullCount: number | null;
  distinctCount: number | null;
  minValue: string | null;
  maxValue: string | null;
  stats?: {
    mean?: number;
    sum?: number;
    stdDev?: number;
    topValues?: Array<{ value: any; count: number; percentage: number }>;
  };
  sampleValues?: any[];
}

export default function SourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [source, setSource] = useState<any>(null);
  const [columns, setColumns] = useState<ColumnProfileItem[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"columns" | "preview">("columns");

  useEffect(() => {
    async function loadDetail() {
      try {
        setLoading(true);
        const res = await fetch(`/api/sources/${id}`);
        const data = await res.json();
        if (res.ok) {
          setSource(data.source);
          setColumns(data.columns || []);
          setPreview(data.preview || []);
        } else {
          setError(data.error || "Failed to load source details");
        }
      } catch {
        setError("Error connecting to server");
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-32 bg-card rounded-xl border border-border" />
        <div className="h-96 bg-card rounded-xl border border-border" />
      </div>
    );
  }

  if (error || !source) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-destructive font-medium">{error || "Source not found"}</p>
        <Link href="/app/sources">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Sources
          </Button>
        </Link>
      </div>
    );
  }

  const isPg = source.kind === "pg_table";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/app/sources">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{source.alias}</h1>
              <Badge variant={isPg ? "info" : "success"} className="text-xs capitalize">
                {isPg ? "PostgreSQL Table" : "Excel Sheet"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isPg ? `Table: ${source.schemaName}.${source.tableName}` : `Sheet: ${source.sheetName || "Default"}`} • {source.rowCount?.toLocaleString()} rows profiled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/app/prep">
            <Button size="sm" className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              Consolidate in Model
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Total Rows</span>
          <p className="text-2xl font-bold text-foreground mt-1">{source.rowCount?.toLocaleString() ?? "—"}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Attributes / Cols</span>
          <p className="text-2xl font-bold text-foreground mt-1">{columns.length}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Measures Detected</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {columns.filter((c) => c.semanticRole === "measure").length}
          </p>
        </Card>
        <Card className="p-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Dimensions</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {columns.filter((c) => c.semanticRole === "dimension" || c.semanticRole === "temporal").length}
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Button
          variant={activeTab === "columns" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("columns")}
          className="gap-1.5"
        >
          <Layers className="h-4 w-4" />
          Semantic Column Profile ({columns.length})
        </Button>
        <Button
          variant={activeTab === "preview" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("preview")}
          className="gap-1.5"
        >
          <TableIcon className="h-4 w-4" />
          Raw Parquet Preview ({preview.length} rows)
        </Button>
      </div>

      {/* Tab: Column Profiles */}
      {activeTab === "columns" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50 font-semibold text-muted-foreground">
                  <th className="p-3 pl-4">Column Name</th>
                  <th className="p-3">Inferred Role</th>
                  <th className="p-3">Storage Type</th>
                  <th className="p-3">Distinct Values</th>
                  <th className="p-3">Null %</th>
                  <th className="p-3">Min / Max or Mean</th>
                  <th className="p-3 pr-4">Top Values / Distribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {columns.map((col) => {
                  const nullPct =
                    source.rowCount && col.nullCount !== null
                      ? ((col.nullCount / source.rowCount) * 100).toFixed(1)
                      : "0";

                  const roleColor =
                    col.semanticRole === "measure"
                      ? "text-blue-600 bg-blue-500/10 border-blue-500/20"
                      : col.semanticRole === "temporal"
                        ? "text-purple-600 bg-purple-500/10 border-purple-500/20"
                        : col.semanticRole === "identifier"
                          ? "text-amber-600 bg-amber-500/10 border-amber-500/20"
                          : "text-emerald-600 bg-emerald-500/10 border-emerald-500/20";

                  return (
                    <tr key={col.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 pl-4 font-mono font-medium text-foreground">
                        {col.rawName}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${roleColor}`}>
                          {col.semanticRole}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground font-mono">{col.storageType}</td>
                      <td className="p-3 font-medium text-foreground">
                        {col.distinctCount?.toLocaleString() ?? "—"}
                      </td>
                      <td className="p-3">
                        <span className={Number(nullPct) > 10 ? "text-amber-600 font-semibold" : "text-muted-foreground"}>
                          {nullPct}%
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {col.stats?.mean != null ? (
                          <span>Mean: {col.stats.mean.toLocaleString()}</span>
                        ) : col.minValue || col.maxValue ? (
                          <span className="truncate max-w-[150px] inline-block">
                            {col.minValue} → {col.maxValue}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3 pr-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {col.stats?.topValues?.slice(0, 3).map((tv, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground truncate"
                              title={`${tv.value} (${tv.count} times)`}
                            >
                              {String(tv.value)}: {tv.percentage.toFixed(0)}%
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab: Raw Preview */}
      {activeTab === "preview" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto max-h-[500px]">
            {preview.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">No preview records available.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead className="sticky top-0 bg-muted border-b border-border shadow-sm">
                  <tr>
                    {Object.keys(preview[0]).map((k) => (
                      <th key={k} className="p-2.5 px-3 font-semibold text-foreground whitespace-nowrap">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-muted/30">
                      {Object.keys(preview[0]).map((k) => (
                        <td key={k} className="p-2 px-3 whitespace-nowrap text-muted-foreground">
                          {row[k] !== null && row[k] !== undefined ? String(row[k]) : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
