"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  Search,
  Table as TableIcon,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Database,
} from "lucide-react";
import { DataModelVisualizer } from "@/components/visuals/data-model-visualizer";

import { StitchHeroKpiRibbon } from "@/components/dashboard/stitch-hero-kpi-ribbon";
import { StitchIngestionVelocity } from "@/components/dashboard/stitch-ingestion-velocity";
import { StitchAutonomousInsights } from "@/components/dashboard/stitch-autonomous-insights";
import { StitchConnectorsMonitor } from "@/components/dashboard/stitch-connectors-monitor";
import { StitchSqlProfiler } from "@/components/dashboard/stitch-sql-profiler";
import { StitchPipelineFlowMap } from "@/components/dashboard/stitch-pipeline-flow-map";
import { StitchLatencyHeatmap } from "@/components/dashboard/stitch-latency-heatmap";

import { clientCache } from "@/lib/cache/client-cache";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";

// Consolidated Model Data
const CONSOLIDATED_METRICS = {
  revenue: "$2.4M",
  revenueDelta: "+12.5%",
  conversion: "24.8%",
  conversionDelta: "+3.2%",
  activeDeals: "147",
  activeDealsDelta: "-5",
  newLeads: "892",
  newLeadsDelta: "+18.3%",
  pipelineValue: "$4.8M",
  trendTitle: "Revenue Trend",
  trendSubtitle: "Monthly performance vs target",
  stages: [
    { name: "Lead", count: "892", percent: 45, color: "bg-blue-600" },
    { name: "Qualified", count: "556", percent: 28, color: "bg-indigo-600" },
    { name: "Proposal", count: "357", percent: 18, color: "bg-violet-600" },
    { name: "Negotiation", count: "179", percent: 9, color: "bg-purple-600" },
  ],
  trendData: [
    { month: "Jan", primary: 210, target: 200 },
    { month: "Feb", primary: 290, target: 250 },
    { month: "Mar", primary: 340, target: 300 },
    { month: "Apr", primary: 380, target: 350 },
    { month: "May", primary: 420, target: 390 },
    { month: "Jun", primary: 450, target: 410 },
    { month: "Jul", primary: 470, target: 430 },
    { month: "Aug", primary: 510, target: 460 },
    { month: "Sep", primary: 490, target: 480 },
    { month: "Oct", primary: 560, target: 500 },
    { month: "Nov", primary: 580, target: 520 },
    { month: "Dec", primary: 620, target: 550 },
  ],
  deals: [
    { initial: "A", name: "Acme Corp", rep: "Sarah Chen", time: "2 hours ago", value: "$125,000", status: "Won", statusColor: "emerald" },
    { initial: "T", name: "TechStart Inc", rep: "Mike Johnson", time: "5 hours ago", value: "$89,500", status: "Pending", statusColor: "amber" },
    { initial: "G", name: "GlobalFin", rep: "Emily Davis", time: "1 day ago", value: "$245,000", status: "Pending", statusColor: "amber" },
    { initial: "D", name: "DataSync Solutions", rep: "James Wilson", time: "2 days ago", value: "$67,800", status: "Lost", statusColor: "rose" },
    { initial: "C", name: "CloudBase Ltd", rep: "Sarah Chen", time: "3 days ago", value: "$178,000", status: "Won", statusColor: "emerald" },
  ],
  performers: [
    { initials: "SC", name: "Sarah Chen", rank: "#1", deals: "24 deals closed", value: "$487,500", change: "+15%" },
    { initials: "MJ", name: "Mike Johnson", rank: "#2", deals: "19 deals closed", value: "$356,200", change: "+8%" },
    { initials: "ED", name: "Emily Davis", rank: "#3", deals: "17 deals closed", value: "$312,800", change: "+12%" },
    { initials: "JW", name: "James Wilson", rank: "#4", deals: "15 deals closed", value: "$289,400", change: "+5%" },
    { initials: "LP", name: "Lisa Park", rank: "#5", deals: "14 deals closed", value: "$267,100", change: "+9%" },
  ],
};

// Housing Model Data
const HOUSING_METRICS = {
  revenue: "$152M",
  revenueDelta: "+8.7%",
  conversion: "68.4%",
  conversionDelta: "+4.1%",
  activeDeals: "312",
  activeDealsDelta: "+14",
  newLeads: "1,240",
  newLeadsDelta: "+22.6%",
  pipelineValue: "$240M",
  trendTitle: "Valuation Trend",
  trendSubtitle: "Median sale price vs listing benchmark",
  stages: [
    { name: "New Listing", count: "1,240", percent: 48, color: "bg-blue-600" },
    { name: "Under Review", count: "650", percent: 25, color: "bg-indigo-600" },
    { name: "Escrow Pending", count: "420", percent: 16, color: "bg-violet-600" },
    { name: "Closed Sale", count: "280", percent: 11, color: "bg-purple-600" },
  ],
  trendData: [
    { month: "Jan", primary: 390, target: 380 },
    { month: "Feb", primary: 410, target: 400 },
    { month: "Mar", primary: 435, target: 420 },
    { month: "Apr", primary: 460, target: 440 },
    { month: "May", primary: 480, target: 460 },
    { month: "Jun", primary: 510, target: 490 },
    { month: "Jul", primary: 525, target: 500 },
    { month: "Aug", primary: 540, target: 515 },
    { month: "Sep", primary: 535, target: 520 },
    { month: "Oct", primary: 560, target: 530 },
    { month: "Nov", primary: 575, target: 540 },
    { month: "Dec", primary: 595, target: 550 },
  ],
  deals: [
    { initial: "O", name: "Oakridge Estate #412", rep: "Marcus Vance", time: "1 hour ago", value: "$850,000", status: "Won", statusColor: "emerald" },
    { initial: "S", name: "Sunset Harbor Condo", rep: "Elena Rostova", time: "4 hours ago", value: "$495,000", status: "Pending", statusColor: "amber" },
    { initial: "P", name: "Pinecrest Duplex", rep: "Marcus Vance", time: "1 day ago", value: "$720,000", status: "Pending", statusColor: "amber" },
    { initial: "B", name: "Bellevue Townhome", rep: "David Kim", time: "2 days ago", value: "$610,000", status: "Lost", statusColor: "rose" },
    { initial: "C", name: "Crestview Heights", rep: "Elena Rostova", time: "3 days ago", value: "$1,150,000", status: "Won", statusColor: "emerald" },
  ],
  performers: [
    { initials: "MV", name: "Marcus Vance", rank: "#1", deals: "18 listings closed", value: "$14.2M", change: "+22%" },
    { initials: "ER", name: "Elena Rostova", rank: "#2", deals: "14 listings closed", value: "$11.8M", change: "+16%" },
    { initials: "DK", name: "David Kim", rank: "#3", deals: "12 listings closed", value: "$9.5M", change: "+8%" },
    { initials: "AL", name: "Anna Lin", rank: "#4", deals: "9 listings closed", value: "$7.2M", change: "+5%" },
    { initials: "CH", name: "Chris Hayes", rank: "#5", deals: "8 listings closed", value: "$6.4M", change: "+11%" },
  ],
};

export default function DashboardPage() {
  const [datasets, setDatasets] = useState<any[]>(() => clientCache.datasets || []);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(() => clientCache.activeDatasetId || clientCache.datasets?.[0]?.id || null);
  const [datasetDetail, setDatasetDetail] = useState<any>(() => {
    const initialId = clientCache.activeDatasetId || clientCache.datasets?.[0]?.id;
    return initialId ? clientCache.details[initialId] || null : null;
  });
  const [loading, setLoading] = useState(!clientCache.datasets);
  const [, setError] = useState<string | null>(null);

  // Model selector: drives which dataset is active
  const [selectedModel, setSelectedModel] = useState<"consolidated" | "housing">(() => {
    return (clientCache.activeModel as any) === "housing" ? "housing" : "consolidated";
  });
  const [timeRange, setTimeRange] = useState(() => clientCache.activeTimeRange || "Last 30 days");
  const [stageFilter, setStageFilter] = useState<"All" | "Won" | "Pending" | "Lost">("All");
  const [dealSearchQuery, setDealSearchQuery] = useState("");

  // Clear All Data confirmation & cleared flag
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);
  const [isDataCleared, setIsDataCleared] = useState(false);

  // Raw data search & pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [viewMode, setViewMode] = useState<"overview" | "fabric" | "3d">("overview");
  const [showDataInspector, setShowDataInspector] = useState(false);

  // Synchronize global model and timerange events
  useEffect(() => {
    function onModelChange(e: any) {
      if (e.detail?.model && (e.detail.model === "consolidated" || e.detail.model === "housing")) {
        setSelectedModel(e.detail.model);
      }
    }
    function onTimeRangeChange(e: any) {
      if (e.detail?.timeRange) {
        setTimeRange(e.detail.timeRange);
      }
    }
    window.addEventListener("df-model-change", onModelChange);
    window.addEventListener("df-timerange-change", onTimeRangeChange);
    return () => {
      window.removeEventListener("df-model-change", onModelChange);
      window.removeEventListener("df-timerange-change", onTimeRangeChange);
    };
  }, []);

  // Active active data model source
  const currentModelData = selectedModel === "consolidated" ? CONSOLIDATED_METRICS : HOUSING_METRICS;

  const displayedTrendData = useMemo(() => {
    if (isDataCleared) return [];
    const all = currentModelData.trendData;
    if (timeRange === "Today") return all.slice(-2);
    if (timeRange === "Last 7 days") return all.slice(-4);
    if (timeRange === "Last 30 days") return all.slice(-6);
    if (timeRange === "Last 90 days") return all.slice(-9);
    return all;
  }, [isDataCleared, currentModelData.trendData, timeRange]);

  const filteredDeals = useMemo(() => {
    if (isDataCleared) return [];
    return currentModelData.deals.filter((deal) => {
      const matchStage = stageFilter === "All" || deal.status === stageFilter;
      const matchSearch =
        !dealSearchQuery ||
        deal.name.toLowerCase().includes(dealSearchQuery.toLowerCase()) ||
        deal.rep.toLowerCase().includes(dealSearchQuery.toLowerCase());
      return matchStage && matchSearch;
    });
  }, [isDataCleared, currentModelData.deals, stageFilter, dealSearchQuery]);

  // Resolve which dataset corresponds to the currently selected model
  const resolveModelDatasetId = useCallback((model: "consolidated" | "housing", datasetList: any[]): string | null => {
    if (datasetList.length === 0) return null;
    const keyword = model === "consolidated" ? "consolidated" : "housing";
    const matched = datasetList.find((d) => d.name?.toLowerCase().includes(keyword));
    if (matched) return matched.id;
    if (model === "consolidated") return datasetList[0]?.id ?? null;
    if (model === "housing") return datasetList[1]?.id ?? datasetList[0]?.id ?? null;
    return datasetList[0]?.id ?? null;
  }, []);

  const handleModelChange = useCallback((model: "consolidated" | "housing", datasetList: any[]) => {
    setSelectedModel(model);
    setIsDataCleared(false);
    const newId = resolveModelDatasetId(model, datasetList);
    clientCache.setModel(model, newId);
    if (newId && newId !== activeDatasetId) {
      setActiveDatasetId(newId);
      setTablePage(1);
    }
  }, [activeDatasetId, resolveModelDatasetId]);

  // Initial Load: Datasets
  useEffect(() => {
    let isSubscribed = true;
    async function loadDatasets() {
      try {
        if (!clientCache.datasets) {
          setLoading(true);
        }
        const res = await fetch("/api/datasets");
        const data = await res.json();
        if (res.ok && data.datasets?.length > 0) {
          clientCache.datasets = data.datasets;
          if (isSubscribed) {
            setDatasets(data.datasets);
            const firstId = data.datasets[0].id;
            clientCache.activeDatasetId = clientCache.activeDatasetId || firstId;
            setActiveDatasetId((prev) => prev || firstId);
          }
        } else if (res.ok) {
          const srcRes = await fetch("/api/sources");
          const srcData = await srcRes.json();
          if (srcRes.ok && srcData.sources) {
            clientCache.sources = srcData.sources;
          }
        }
      } catch {
        if (isSubscribed) setError("Error loading datasets");
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }
    loadDatasets();
    return () => {
      isSubscribed = false;
    };
  }, []);

  // When active dataset changes, fetch dataset details
  useEffect(() => {
    if (!activeDatasetId) return;
    const datasetId = activeDatasetId;
    clientCache.activeDatasetId = datasetId;

    if (clientCache.details[datasetId]) {
      setDatasetDetail(clientCache.details[datasetId]);
      return;
    }

    async function loadActiveDataset() {
      try {
        const res = await fetch(`/api/datasets/${datasetId}`);
        const data = await res.json();
        if (res.ok) {
          clientCache.details[datasetId] = data;
          setDatasetDetail(data);
        }
      } catch {
        // ignore
      }
    }
    loadActiveDataset();
  }, [activeDatasetId]);

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
      <div className="p-6 space-y-6 max-w-7xl w-full mx-auto animate-pulse">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800/80 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800" />
          ))}
        </div>
        <div className="h-72 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800" />
      </div>
    );
  }

  const profile = datasetDetail?.profile;

  return (
    <div className="p-6 space-y-6 max-w-7xl w-full mx-auto transition-colors">
      {/* Clear All Data Confirmation Modal */}
      {showClearConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) setShowClearConfirm(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-500/15 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Clear All Data?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              This will permanently wipe all ingested datasets, data sources, and analytical metrics from your workspace.
            </p>
            {clearSuccess && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                <span className="font-semibold">✓</span> All data cleared successfully.
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClearConfirm(false)}
                disabled={clearing}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={clearing || clearSuccess}
                onClick={async () => {
                  try {
                    setClearing(true);
                    const dRes = await fetch("/api/datasets", { method: "GET" });
                    const dData = await dRes.json();
                    const datasetList: any[] = dData.datasets || [];
                    await Promise.all(
                      datasetList.map((d: any) => fetch(`/api/datasets/${d.id}`, { method: "DELETE" }))
                    );
                    const sRes = await fetch("/api/sources", { method: "GET" });
                    const sData = await sRes.json();
                    const sourceList: any[] = sData.sources || [];
                    await Promise.all(
                      sourceList.map((s: any) => fetch(`/api/sources/${s.id}`, { method: "DELETE" }))
                    );
                    clientCache.datasets = null;
                    clientCache.sources = null;
                    clientCache.activeDatasetId = null;
                    clientCache.details = {};
                    clientCache.kpis = {};
                    clientCache.insights = {};
                    clientCache.charts = {};
                    setDatasets([]);
                    setActiveDatasetId(null);
                    setDatasetDetail(null);
                    setIsDataCleared(true);
                    setClearSuccess(true);
                    setTimeout(() => {
                      setShowClearConfirm(false);
                      setClearSuccess(false);
                    }, 1200);
                  } catch {
                    setError("Failed to clear data.");
                    setShowClearConfirm(false);
                  } finally {
                    setClearing(false);
                  }
                }}
                className="gap-1.5 bg-rose-600 hover:bg-rose-500 text-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {clearing ? "Clearing..." : "Clear All Data"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Controls: Model Toggle + View Modes + Clear */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex flex-wrap items-center gap-3">
          {/* Functional Model Selector Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 p-1 shadow-inner">
            <button
              type="button"
              id="model-toggle-consolidated"
              onClick={() => handleModelChange("consolidated", datasets)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                selectedModel === "consolidated"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Consolidated Model
            </button>
            <button
              type="button"
              id="model-toggle-housing"
              onClick={() => handleModelChange("housing", datasets)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                selectedModel === "housing"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Housing Model
            </button>
          </div>

          <Badge variant="outline" className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 text-xs font-mono">
            {isDataCleared
              ? "0 records sync (Cleared)"
              : profile?.rowCount
              ? `${profile.rowCount.toLocaleString()} records sync`
              : "PostgreSQL 16 active"}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("overview")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === "overview"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              SalesOps
            </button>
            <button
              type="button"
              onClick={() => setViewMode("fabric")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === "fabric"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Telemetry
            </button>
            <button
              type="button"
              onClick={() => setViewMode("3d")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === "3d"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Model 3D</span>
            </button>
          </div>

          {datasetDetail && !isDataCleared && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDataInspector(!showDataInspector)}
              className="gap-1.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs h-8"
            >
              <TableIcon className="h-3.5 w-3.5" />
              {showDataInspector ? "Hide Table" : "Inspect Raw"}
            </Button>
          )}

          {/* If cleared, show restore button */}
          {isDataCleared && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDataCleared(false)}
              className="gap-1.5 rounded-xl border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs h-8"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restore Sample Data</span>
            </Button>
          )}

          {/* Clear Data Action */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowClearConfirm(true)}
            className="gap-1.5 rounded-xl border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs h-8"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Data</span>
          </Button>
        </div>
      </div>

      {/* Cleared Notice Banner */}
      {isDataCleared && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <Trash2 className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Workspace Data Cleared</p>
              <p className="text-xs text-amber-800 dark:text-amber-300/80 mt-0.5">
                All datasets have been wiped. You can connect new databases or restore sample data to resume analytics.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => setIsDataCleared(false)}
              className="gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs h-8"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restore Sample Data</span>
            </Button>
            <Link href="/app/sources">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl border-amber-500/30 text-xs h-8"
              >
                <Database className="h-3.5 w-3.5" />
                <span>Connect Source</span>
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* VIEW: Data Fabric / Telemetry */}
      {viewMode === "fabric" && (
        <div className="space-y-6">
          <StitchHeroKpiRibbon />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StitchIngestionVelocity />
            <StitchAutonomousInsights />
          </div>
          <StitchPipelineFlowMap />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StitchConnectorsMonitor />
            <StitchLatencyHeatmap />
          </div>
          <StitchSqlProfiler />
        </div>
      )}

      {/* VIEW: 3D Data Model */}
      {viewMode === "3d" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 backdrop-blur-sm shadow-sm">
          <DataModelVisualizer />
        </div>
      )}

      {/* VIEW: Overview (SalesOps UI with full theme support) */}
      {viewMode === "overview" && (
        <div className="space-y-6">
          {/* Stat Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1 */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl backdrop-blur-sm shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {selectedModel === "consolidated" ? "Total Revenue" : "Portfolio Valuation"}
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {isDataCleared ? "$0.00" : currentModelData.revenue}
                </span>
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  {isDataCleared ? "0.0%" : currentModelData.revenueDelta}
                </span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl backdrop-blur-sm shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {selectedModel === "consolidated" ? "Conversion Rate" : "Absorption Rate"}
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {isDataCleared ? "0.0%" : currentModelData.conversion}
                </span>
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  {isDataCleared ? "0.0%" : currentModelData.conversionDelta}
                </span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl backdrop-blur-sm shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {selectedModel === "consolidated" ? "Active Deals" : "Active Listings"}
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {isDataCleared ? "0" : currentModelData.activeDeals}
                </span>
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  {isDataCleared ? "0" : currentModelData.activeDealsDelta}
                </span>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl backdrop-blur-sm shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {selectedModel === "consolidated" ? "New Leads" : "Client Inquiries"}
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {isDataCleared ? "0" : currentModelData.newLeads}
                </span>
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  {isDataCleared ? "0.0%" : currentModelData.newLeadsDelta}
                </span>
              </div>
            </div>
          </div>

          {/* Mid Section: Chart and Progress Stage Bars */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Trend Graph */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">{currentModelData.trendTitle}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{currentModelData.trendSubtitle}</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                    <span className="text-slate-600 dark:text-slate-400">Observed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-0.5 w-3 bg-slate-400 dark:bg-slate-500"></span>
                    <span className="text-slate-600 dark:text-slate-400">Target</span>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={displayedTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis dataKey="month" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748b" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}k`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", borderColor: "#334155", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}
                      itemStyle={{ color: "#e2e8f0", fontSize: "12px" }}
                      formatter={(val: any, name: any) => [`$${val}k`, name === "primary" ? "Current" : "Target"]}
                    />
                    <Area type="monotone" dataKey="primary" stroke="#6366f1" strokeWidth={2.5} fill="url(#revGrad)" />
                    <Line type="monotone" dataKey="target" stroke="#64748b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pipeline Distribution */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Pipeline Stages</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Distribution by stage</p>

                <div className="space-y-4">
                  {currentModelData.stages.map((stage) => (
                    <div key={stage.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-700 dark:text-slate-300">{stage.name}</span>
                        <div className="flex gap-2">
                          <span className="text-slate-500 dark:text-slate-400">{isDataCleared ? "0" : stage.count}</span>
                          <span className="text-slate-900 dark:text-slate-200 font-semibold">{isDataCleared ? "0%" : `${stage.percent}%`}</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${stage.color} rounded-full`} style={{ width: isDataCleared ? "0%" : `${stage.percent}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Pipeline Value</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{isDataCleared ? "$0.00" : currentModelData.pipelineValue}</span>
              </div>
            </div>
          </div>

          {/* Bottom Tables: Deals & Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Deals Activity with interactive stage filters and search */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent Activity</h2>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                      {filteredDeals.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Interactive transaction monitor</p>
                </div>

                {/* Stage Filter Chips */}
                <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-lg text-xs">
                  {(["All", "Won", "Pending", "Lost"] as const).map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => setStageFilter(stage)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                        stageFilter === stage
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deals Search Input */}
              <div className="mb-3 relative">
                <input
                  type="text"
                  placeholder="Filter transactions by account or rep..."
                  value={dealSearchQuery}
                  onChange={(e) => setDealSearchQuery(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder:text-slate-400"
                />
                {dealSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setDealSearchQuery("")}
                    className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    ×
                  </button>
                )}
              </div>

              {isDataCleared ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No active transactions. Ingest datasets or click &quot;Restore Sample Data&quot;.
                </div>
              ) : filteredDeals.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                  <p>No transactions match the selected filter criteria.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setStageFilter("All");
                      setDealSearchQuery("");
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 underline font-semibold"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredDeals.map((deal) => {
                    const badgeClass =
                      deal.status === "Won"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : deal.status === "Pending"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";

                    return (
                      <div key={deal.name} className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/20 px-2 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200">
                            {deal.initial}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-200">{deal.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{deal.rep} • {deal.time}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{deal.value}</span>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${badgeClass}`}>
                            {deal.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top Performers List */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Top Performers</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">This month&apos;s leaders</p>
                </div>
                <Link href="/app/insights" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                  Analytics
                </Link>
              </div>

              {isDataCleared ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No performer metrics. Data has been wiped.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {currentModelData.performers.map((perf) => (
                    <div key={perf.name} className="py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/20 px-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {perf.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-200">{perf.name}</p>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                              {perf.rank}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{perf.deals}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{perf.value}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{perf.change}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Collapsible Raw Data Inspector (if active dataset is loaded) */}
          {showDataInspector && datasetDetail?.preview && !isDataCleared && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 backdrop-blur-sm space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Active Dataset Records</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Previewing live parquet table rows</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setTablePage(1);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      {Object.keys(pagedRows[0] || {}).map((col) => (
                        <th key={col} className="px-4 py-2.5 font-medium">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                    {pagedRows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        {Object.values(row).map((val: any, cIdx: number) => (
                          <td key={cIdx} className="px-4 py-2 font-mono whitespace-nowrap">
                            {String(val ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
