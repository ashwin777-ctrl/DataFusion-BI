import React from "react";
import { TrendingUp, TrendingDown, Activity, Sparkles } from "lucide-react";

interface StitchHeroKpiRibbonProps {
  totalRecords?: string;
  recordsDelta?: string;
  activePipelines?: string;
  pipelineHealthPct?: string;
  medianLatency?: string;
  latencyDelta?: string;
  computeSpend?: string;
  budgetCap?: string;
}

export function StitchHeroKpiRibbon({
  totalRecords = "4.82B",
  recordsDelta = "+18.4%",
  activePipelines = "142 / 144 Healthy",
  pipelineHealthPct = "99.98%",
  medianLatency = "128ms",
  latencyDelta = "-24ms",
  computeSpend = "$12,480",
  budgetCap = "$16,400",
}: StitchHeroKpiRibbonProps) {
  const [pipelineCount, pipelineStatus] = activePipelines.includes("/")
    ? activePipelines.split("/")
    : ["142", "144 Healthy"];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* KPI 1: Processed Records */}
      <div className="group relative bg-white dark:bg-[#101012] border border-black/[0.06] dark:border-white/[0.08] rounded-[20px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.02)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.85)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_6px_20px_rgba(0,0,0,0.9)] transition-all duration-300 flex flex-col justify-between overflow-hidden">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Processed Records
            </span>
            <span className="p-1.5 text-foreground bg-black/[0.04] dark:bg-white/[0.06] rounded-full border border-black/[0.04] dark:border-white/[0.08]">
              <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-semibold tracking-tight text-foreground font-mono tabular-nums">
              {totalRecords}
            </span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-3 h-3" /> {recordsDelta}
            </span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">Vs. 7D Baseline</span>
            <span className="text-xs font-mono tabular-nums text-secondary-foreground font-medium">4.07B rec</span>
          </div>
          {/* Sparkline SVG */}
          <svg className="w-24 h-7 text-blue-600 dark:text-blue-400 overflow-visible" fill="none" viewBox="0 0 100 30">
            <path
              d="M0 24 Q 15 20, 25 22 T 50 14 T 75 10 T 100 4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
            />
            <path
              d="M0 24 Q 15 20, 25 22 T 50 14 T 75 10 T 100 4 L 100 30 L 0 30 Z"
              fill="currentColor"
              fillOpacity="0.1"
            />
          </svg>
        </div>
      </div>

      {/* KPI 2: Active ETL Pipelines */}
      <div className="group relative bg-white dark:bg-[#101012] border border-black/[0.06] dark:border-white/[0.08] rounded-[20px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.02)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.85)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_6px_20px_rgba(0,0,0,0.9)] transition-all duration-300 flex flex-col justify-between overflow-hidden">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Active ETL Pipelines
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              {pipelineHealthPct} SLA
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-semibold tracking-tight text-foreground font-mono tabular-nums">
              {pipelineCount?.trim()}
            </span>
            <span className="text-sm text-muted-foreground font-medium">/ {pipelineStatus?.trim()}</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-black/[0.04] dark:border-white/[0.06] space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">Sync Pool Velocity</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">2 Degraded / Backfilled</span>
          </div>
          <div className="w-full bg-black/[0.06] dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 h-full w-[98.6%]" />
            <div className="bg-blue-500 h-full w-[1.4%]" />
          </div>
        </div>
      </div>

      {/* KPI 3: Median Query Latency */}
      <div className="group relative bg-white dark:bg-[#101012] border border-black/[0.06] dark:border-white/[0.08] rounded-[20px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.02)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.85)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_6px_20px_rgba(0,0,0,0.9)] transition-all duration-300 flex flex-col justify-between overflow-hidden">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Median Query Latency
            </span>
            <span className="p-1.5 text-foreground bg-black/[0.04] dark:bg-white/[0.06] rounded-full border border-black/[0.04] dark:border-white/[0.08]">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-semibold tracking-tight text-foreground font-mono tabular-nums">
              {medianLatency}
            </span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <TrendingDown className="w-3 h-3" /> {latencyDelta}
            </span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">P99 (Ran50)</span>
            <span className="text-xs font-mono tabular-nums text-secondary-foreground font-medium">412ms (Optimal)</span>
          </div>
          {/* Latency Sparkline */}
          <svg className="w-24 h-7 text-emerald-500 dark:text-emerald-400 overflow-visible" fill="none" viewBox="0 0 100 30">
            <path
              d="M0 8 Q 20 18, 40 12 T 70 20 T 100 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
            />
            <path
              d="M0 8 Q 20 18, 40 12 T 70 20 T 100 24 L 100 30 L 0 30 Z"
              fill="currentColor"
              fillOpacity="0.1"
            />
          </svg>
        </div>
      </div>

      {/* KPI 4: Monthly Compute Spend */}
      <div className="group relative bg-white dark:bg-[#101012] border border-black/[0.06] dark:border-white/[0.08] rounded-[20px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.02)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.85)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_6px_20px_rgba(0,0,0,0.9)] transition-all duration-300 flex flex-col justify-between overflow-hidden">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Monthly Compute Spend
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] text-muted-foreground text-[11px] font-mono font-medium">
              CAP {budgetCap}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-semibold tracking-tight text-foreground font-mono tabular-nums">
              {computeSpend}
            </span>
            <span className="text-xs font-medium text-muted-foreground">76% of budget</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-black/[0.04] dark:border-white/[0.06] space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">Est. Runway Balance</span>
            <span className="text-secondary-foreground font-mono font-medium tabular-nums">6.4 Days / $840/day</span>
          </div>
          <div className="w-full bg-black/[0.06] dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-600 dark:bg-blue-500 h-full w-[76%] rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
