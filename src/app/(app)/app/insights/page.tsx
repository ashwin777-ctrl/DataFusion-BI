"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Lightbulb,
  CheckCircle2,
  Layers,
  ArrowRight,
  Target,
} from "lucide-react";

export default function InsightsPage() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    async function loadDatasets() {
      try {
        setLoading(true);
        const res = await fetch("/api/datasets");
        const data = await res.json();
        if (res.ok && data.datasets?.length > 0) {
          setDatasets(data.datasets);
          setActiveDatasetId(data.datasets[0].id);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadDatasets();
  }, []);

  useEffect(() => {
    if (!activeDatasetId) return;

    async function loadInsights() {
      try {
        setRefreshing(true);
        const res = await fetch(`/api/datasets/${activeDatasetId}/insights`);
        const data = await res.json();
        if (res.ok) {
          setReport(data);
        }
      } catch {
        // ignore
      } finally {
        setRefreshing(false);
      }
    }
    loadInsights();
  }, [activeDatasetId]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-36 bg-card rounded-xl border border-border" />
        <div className="h-64 bg-card rounded-xl border border-border" />
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="p-8 text-center space-y-4 rounded-xl border border-dashed border-border bg-card">
        <Sparkles className="h-8 w-8 text-primary mx-auto" />
        <h2 className="text-lg font-semibold text-foreground">No datasets available for analysis</h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Upload data or configure a data model to automatically generate business insights.
        </p>
        <Link href="/app/sources">
          <Button size="sm">Go to Data Sources</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Automated Business Insights
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Statistical signals, key growth drivers, and anomaly flags computed directly from DuckDB Parquet data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={activeDatasetId || ""}
            onChange={(e) => setActiveDatasetId(e.target.value)}
            className="rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-semibold text-foreground"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <Link href="/app/reports">
            <Button variant="outline" size="sm" className="gap-1.5">
              Generate Formal Report
            </Button>
          </Link>
        </div>
      </div>

      {refreshing ? (
        <div className="p-12 text-center text-sm text-muted-foreground animate-pulse">
          Computing statistical distributions and signals across datasets...
        </div>
      ) : !report ? (
        <p className="text-xs text-muted-foreground">Unable to generate insights for this dataset.</p>
      ) : (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="stitch-card p-6 shadow-xl">
            <div className="flex items-center gap-2 text-white font-semibold text-sm mb-2">
              <Target className="h-4 w-4" />
              <span className="font-mono uppercase tracking-wider text-xs">Autonomous Executive Briefing</span>
            </div>
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {report.executiveSummary}
            </p>

            <div className="mt-4 pt-4 border-t border-slate-800/80 grid sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Total Transactions Evaluated</span>
                <span className="font-bold text-foreground text-sm font-mono">
                  {report.dataQualitySummary?.totalRows?.toLocaleString() ?? "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Data Completeness Index</span>
                <span className="font-bold text-emerald-400 text-sm font-mono">
                  {report.dataQualitySummary?.completenessPercentage}%
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Actionable Signals Detected</span>
                <span className="font-bold text-cyan-400 text-sm font-mono">
                  {report.insights?.length ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Key Findings List */}
          <div className="stitch-card p-6 space-y-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              Core Analytical Findings
            </h2>
            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              {report.keyFindings?.map((finding: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg border border-cyan-500/20 bg-[#0d1627]/80 text-xs text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{finding}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Strategic Insights Cards */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              Strategic Opportunities & Risk Drivers ({report.insights?.length || 0})
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {report.insights?.map((item: any) => {
                const isRisk = item.category === "risk";
                const isOpp = item.category === "opportunity";
                const isAnomaly = item.category === "anomaly";

                const badgeVariant = isOpp ? "success" : isRisk ? "destructive" : isAnomaly ? "warning" : "default";

                return (
                  <div key={item.id} className="stitch-card p-5 flex flex-col justify-between space-y-4 hover:border-cyan-500/40 transition-all shadow-lg">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant={badgeVariant} className="text-[10px] uppercase font-mono tracking-wider">
                          {item.category}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {(item.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-foreground">
                        {item.title}
                      </h3>

                      <p className="text-xs text-secondary-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {item.recommendation && (
                      <div className="rounded-lg bg-[#0d1627]/90 p-3 text-xs border border-cyan-500/20">
                        <strong className="text-cyan-300 block mb-0.5 flex items-center gap-1 font-semibold text-[11px] uppercase tracking-wider font-mono">
                          <ArrowRight className="h-3 w-3 text-cyan-400" /> Recommended Action:
                        </strong>
                        <span className="text-slate-300 leading-relaxed">{item.recommendation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
