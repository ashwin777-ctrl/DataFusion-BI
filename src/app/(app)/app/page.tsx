"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Layers,
  Database,
  Download,
  Search,
  Table as TableIcon,
  AlertCircle,
  Plus,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

const CHART_COLORS = [
  "#2a78d6", // Primary Blue
  "#eb6834", // Coral Orange
  "#1baf7a", // Teal Green
  "#eda100", // Amber Yellow
  "#e87ba4", // Rose Pink
  "#008300", // Emerald
  "#4a3aa7", // Indigo
  "#e34948", // Crimson
];

export default function DashboardPage() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [datasetDetail, setDatasetDetail] = useState<any>(null);
  const [kpis, setKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Dimension and Measure selectors for Interactive Visual Builder
  const [selectedDimension, setSelectedDimension] = useState<string>("");
  const [selectedMeasure, setSelectedMeasure] = useState<string>("");
  const [selectedSecondaryMeasure, setSelectedSecondaryMeasure] = useState<string>("");
  const [timeBucket, setTimeBucket] = useState<"day" | "week" | "month" | "quarter" | "year">("month");
  const [chartType, setChartType] = useState<"bar" | "line" | "area" | "donut" | "scatter" | "radar">("bar");
  const [chartData, setChartData] = useState<any>(null);
  const [loadingChart, setLoadingChart] = useState(false);

  // Raw data search & pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [tablePage, setTablePage] = useState(1);

  // 1. Initial Load: Datasets
  useEffect(() => {
    async function loadDatasets() {
      try {
        setLoading(true);
        const res = await fetch("/api/datasets");
        const data = await res.json();
        if (res.ok && data.datasets?.length > 0) {
          setDatasets(data.datasets);
          setActiveDatasetId(data.datasets[0].id);
        } else {
          // If no datasets exist, check sources and load them or offer 1-click sample
          const srcRes = await fetch("/api/sources");
          const srcData = await srcRes.json();
          if (srcRes.ok && srcData.sources?.length > 0) {
            // Auto-create dataset from first source
            const s = srcData.sources[0];
            const autoRes = await fetch("/api/datasets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: `${s.alias} Model`, sourceIds: [s.id] }),
            });
            const autoData = await autoRes.json();
            if (autoRes.ok) {
              setDatasets([autoData]);
              setActiveDatasetId(autoData.datasetId);
            }
          }
        }
      } catch {
        setError("Error loading datasets");
      } finally {
        setLoading(false);
      }
    }
    loadDatasets();
  }, []);

  // 2. When active dataset changes, fetch dataset details & KPIs
  useEffect(() => {
    if (!activeDatasetId) return;

    async function loadActiveDataset() {
      try {
        const res = await fetch(`/api/datasets/${activeDatasetId}`);
        const data = await res.json();

        if (res.ok) {
          setDatasetDetail(data);

          // Select defaults
          const defMeas = data.profile.suggestedDefaultMeasure || data.profile.measures[0]?.name || "";
          const defDim = data.profile.suggestedPrimaryDate || data.profile.suggestedDefaultDimension || data.profile.dimensions[0]?.name || "";
          const secMeas = data.profile.measures.length > 1 ? data.profile.measures[1].name : "";

          setSelectedMeasure(defMeas);
          setSelectedDimension(defDim);
          setSelectedSecondaryMeasure(secMeas);

          if (data.profile.suggestedPrimaryDate) {
            setChartType("area");
          } else {
            setChartType("bar");
          }

          // Fetch KPIs
          const kpiRes = await fetch(`/api/datasets/${activeDatasetId}/kpis`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          const kpiData = await kpiRes.json();
          if (kpiRes.ok) {
            setKpis(kpiData.kpis || []);
          }
        } else {
          setError(data.error || "Failed to load dataset details");
        }
      } catch {
        setError("Error loading dataset detail");
      }
    }
    loadActiveDataset();
  }, [activeDatasetId]);

  // 3. When Dimension, Measure, or ChartType changes, fetch chart data
  useEffect(() => {
    if (!activeDatasetId || !selectedMeasure) return;

    async function fetchChart() {
      try {
        setLoadingChart(true);
        const res = await fetch(`/api/datasets/${activeDatasetId}/charts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chartType,
            dimension: selectedDimension || undefined,
            measure: selectedMeasure,
            secondaryMeasure: selectedSecondaryMeasure || undefined,
            timeBucket,
            limit: 40,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setChartData(data);
        }
      } catch {
        // ignore
      } finally {
        setLoadingChart(false);
      }
    }

    fetchChart();
  }, [activeDatasetId, selectedDimension, selectedMeasure, selectedSecondaryMeasure, chartType, timeBucket]);

  const previewRows = useMemo(() => {
    if (!datasetDetail?.preview) return [];
    let rows = datasetDetail.preview as any[];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q)),
      );
    }
    return rows;
  }, [datasetDetail, searchQuery]);

  const pagedRows = useMemo(() => {
    const start = (tablePage - 1) * 15;
    return previewRows.slice(start, start + 15);
  }, [previewRows, tablePage]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-card rounded-xl border border-border" />
          ))}
        </div>
        <div className="h-96 bg-card rounded-xl border border-border" />
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card">
        <div className="p-4 rounded-full bg-primary/10 text-primary mb-4">
          <Database className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Welcome to Confluence BI</h2>
        <p className="text-sm text-muted-foreground max-w-md mt-1 mb-6">
          To generate your interactive dashboard, connect your PostgreSQL database or upload your Excel files.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/app/sources">
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" /> Connect Data Source
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const profile = datasetDetail?.profile;

  return (
    <div className="space-y-6">
      {/* Top Header: Dataset Switcher + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <select
              value={activeDatasetId || ""}
              onChange={(e) => setActiveDatasetId(e.target.value)}
              className="rounded-lg border border-input bg-card px-3 py-1.5 text-base font-bold text-foreground focus:ring-2 focus:ring-accent"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <Badge variant="outline" className="text-xs">
              {profile?.rowCount ? `${profile.rowCount.toLocaleString()} rows` : "Ready"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Dynamic analytical model verified by embedded DuckDB engine.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/app/insights">
            <Button variant="outline" size="sm" className="gap-1.5 text-primary border-primary/30">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Insights
            </Button>
          </Link>

          <Link href="/app/reports">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-4 w-4" />
              Export Pack
            </Button>
          </Link>

          <Link href="/app/sources">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Source
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.slice(0, 4).map((kpi, idx) => {
          const isUp = kpi.trendDirection === "up";
          const isFlat = kpi.trendDirection === "flat";
          const changeColor = isFlat
            ? "text-muted-foreground"
            : kpi.isPositiveChange
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400";

          return (
            <Card key={kpi.id} className="p-4 relative overflow-hidden border-border hover:border-primary/40 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                  {kpi.name}
                </span>
                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                  {kpi.aggregation}
                </Badge>
              </div>

              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {kpi.formattedValue}
                </span>

                {kpi.percentageChange !== null && kpi.percentageChange !== undefined && (
                  <span className={`flex items-center text-xs font-semibold ${changeColor}`}>
                    {isUp ? <TrendingUp className="h-3.5 w-3.5 mr-0.5" /> : <TrendingDown className="h-3.5 w-3.5 mr-0.5" />}
                    {kpi.percentageChange > 0 ? `+${kpi.percentageChange}%` : `${kpi.percentageChange}%`}
                  </span>
                )}
              </div>

              {/* Sparkline mini visual */}
              {kpi.sparkline?.length > 1 && (
                <div className="h-8 mt-2 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={kpi.sparkline.map((v: number, i: number) => ({ v, i }))}>
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        fillOpacity={0.15}
                        strokeWidth={1.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Visual Chart Builder & Controls */}
      <Card className="p-6 space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Chart Type Selector */}
            <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/30">
              <button
                onClick={() => setChartType("bar")}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartType === "bar" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" /> Bar
              </button>
              <button
                onClick={() => setChartType("line")}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartType === "line" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LineChartIcon className="h-3.5 w-3.5" /> Line
              </button>
              <button
                onClick={() => setChartType("area")}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartType === "area" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="h-3.5 w-3.5" /> Area
              </button>
              <button
                onClick={() => setChartType("donut")}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartType === "donut" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <PieChartIcon className="h-3.5 w-3.5" /> Donut
              </button>
              <button
                onClick={() => setChartType("scatter")}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartType === "scatter" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Scatter
              </button>
              <button
                onClick={() => setChartType("radar")}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartType === "radar" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Radar
              </button>
            </div>

            {/* Time bucket (if temporal) */}
            {(chartType === "line" || chartType === "area") && (
              <select
                value={timeBucket}
                onChange={(e) => setTimeBucket(e.target.value as any)}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs font-medium"
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="quarter">Quarterly</option>
                <option value="year">Yearly</option>
              </select>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Dimension dropdown */}
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Dimension:</span>
              <select
                value={selectedDimension}
                onChange={(e) => setSelectedDimension(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1 font-medium text-foreground"
              >
                {profile?.columns?.map((c: any) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Primary Measure dropdown */}
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Measure:</span>
              <select
                value={selectedMeasure}
                onChange={(e) => setSelectedMeasure(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1 font-semibold text-accent"
              >
                {profile?.measures?.map((m: any) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Secondary Measure for Scatter */}
            {chartType === "scatter" && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Y-Axis:</span>
                <select
                  value={selectedSecondaryMeasure}
                  onChange={(e) => setSelectedSecondaryMeasure(e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-1 font-semibold text-emerald-600"
                >
                  {profile?.measures?.map((m: any) => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Visual Canvas */}
        <div className="h-[360px] w-full">
          {loadingChart ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground animate-pulse">
              Computing aggregates in DuckDB...
            </div>
          ) : !chartData || chartData.data?.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No data points matching current selection.
            </div>
          ) : chartType === "bar" ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.data} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="label" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [Number(val).toLocaleString(), selectedMeasure]}
                  contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.9)", borderRadius: 8, color: "#fff", border: "none" }}
                />
                <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]}>
                  {chartData.data.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isAnomaly ? "#e34948" : CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : chartType === "line" ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.data} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [Number(val).toLocaleString(), selectedMeasure]}
                  contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.9)", borderRadius: 8, color: "#fff", border: "none" }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: CHART_COLORS[0] }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : chartType === "area" ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.data} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [Number(val).toLocaleString(), selectedMeasure]}
                  contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.9)", borderRadius: 8, color: "#fff", border: "none" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#areaGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : chartType === "donut" ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.data.slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={120}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="label"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.data.slice(0, 8).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [Number(val).toLocaleString(), selectedMeasure]}
                  contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.9)", borderRadius: 8, color: "#fff", border: "none" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : chartType === "scatter" ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid opacity={0.3} />
                <XAxis type="number" dataKey="value" name={selectedMeasure} tick={{ fontSize: 11 }} />
                <YAxis type="number" dataKey="secondaryValue" name={selectedSecondaryMeasure} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter name="Data Points" data={chartData.data} fill={CHART_COLORS[0]} />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData.data.slice(0, 7)}>
                <PolarGrid opacity={0.3} />
                <PolarAngleAxis dataKey="label" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis />
                <Radar name={selectedMeasure} dataKey="value" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.5} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Raw Data Explorer */}
      <Card className="overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TableIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-semibold text-foreground">Data Explorer (First 100 Sample Rows)</h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search values in table..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setTablePage(1);
              }}
              className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {pagedRows.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">No records match your search query.</p>
        ) : (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {Object.keys(pagedRows[0]).map((k) => (
                    <th key={k} className="p-2.5 px-3 font-semibold text-foreground whitespace-nowrap">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pagedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    {Object.keys(pagedRows[0]).map((k) => (
                      <td key={k} className="p-2 px-3 whitespace-nowrap text-muted-foreground">
                        {row[k] !== null && row[k] !== undefined ? String(row[k]) : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {previewRows.length > 15 && (
          <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
            <span>
              Showing {(tablePage - 1) * 15 + 1} to {Math.min(tablePage * 15, previewRows.length)} of {previewRows.length} sample rows
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={tablePage === 1}
                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                className="h-7 text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={tablePage * 15 >= previewRows.length}
                onClick={() => setTablePage((p) => p + 1)}
                className="h-7 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
