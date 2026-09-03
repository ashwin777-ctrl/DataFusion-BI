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
      <div className="group relative bg-[#0a0a0a] hover:bg-[#111111] border border-white/10 hover:border-white/20 rounded-xl p-5 shadow-2xl backdrop-blur-xl transition-all flex flex-col justify-between overflow-hidden">
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-white/[0.03] rounded-full blur-2xl group-hover:bg-white/[0.06] transition-all pointer-events-none" />
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Processed Records
            </span>
            <span className="p-1 text-white bg-white/10 rounded border border-white/10">
              <Activity className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-semibold tracking-tight text-white font-mono">
              {totalRecords}
            </span>
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> {recordsDelta}
            </span>
          </div>
        </div>
        <div className="mt-4 pt-2 border-t border-white/10 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-zinc-400">Vs. 7D Baseline</span>
            <span className="text-xs font-mono text-zinc-300">4.07B rec</span>
          </div>
          {/* Sparkline SVG */}
          <svg className="w-24 h-7 text-white overflow-visible" fill="none" viewBox="0 0 100 30">
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
      <div className="group relative bg-[#0a0a0a] hover:bg-[#111111] border border-white/10 hover:border-white/20 rounded-xl p-5 shadow-2xl backdrop-blur-xl transition-all flex flex-col justify-between overflow-hidden">
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-white/[0.03] rounded-full blur-2xl group-hover:bg-white/[0.06] transition-all pointer-events-none" />
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Active ETL Pipelines
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {pipelineHealthPct} SLA
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-semibold tracking-tight text-white font-mono">
              {pipelineCount?.trim()}
            </span>
            <span className="text-sm text-zinc-400 font-medium">/ {pipelineStatus?.trim()}</span>
          </div>
        </div>
        <div className="mt-4 pt-2 border-t border-white/10 space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-zinc-400">Sync Pool Velocity</span>
            <span className="text-emerald-400 font-mono font-medium">2 Degraded / Backfilled</span>
          </div>
          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden flex border border-white/5">
            <div className="bg-emerald-400 h-full w-[98.6%]" />
            <div className="bg-white h-full w-[1.4%]" />
          </div>
        </div>
      </div>

      {/* KPI 3: Median Query Latency */}
      <div className="group relative bg-[#0a0a0a] hover:bg-[#111111] border border-white/10 hover:border-white/20 rounded-xl p-5 shadow-2xl backdrop-blur-xl transition-all flex flex-col justify-between overflow-hidden">
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-white/[0.03] rounded-full blur-2xl group-hover:bg-white/[0.06] transition-all pointer-events-none" />
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Median Query Latency
            </span>
            <span className="p-1 text-white bg-white/10 rounded border border-white/10">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-semibold tracking-tight text-white font-mono">
              {medianLatency}
            </span>
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5">
              <TrendingDown className="w-3 h-3" /> {latencyDelta}
            </span>
          </div>
        </div>
        <div className="mt-4 pt-2 border-t border-white/10 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-zinc-400">P99 (Ran50)</span>
            <span className="text-xs font-mono text-zinc-300">412ms (Optimal)</span>
          </div>
          {/* Latency Sparkline */}
          <svg className="w-24 h-7 text-emerald-400 overflow-visible" fill="none" viewBox="0 0 100 30">
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
      <div className="group relative bg-[#0a0a0a] hover:bg-[#111111] border border-white/10 hover:border-white/20 rounded-xl p-5 shadow-2xl backdrop-blur-xl transition-all flex flex-col justify-between overflow-hidden">
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-white/[0.03] rounded-full blur-2xl group-hover:bg-white/[0.06] transition-all pointer-events-none" />
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Monthly Compute Spend
            </span>
            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10 text-zinc-300 text-[11px] font-mono font-semibold">
              CAP {budgetCap}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-semibold tracking-tight text-white font-mono">
              {computeSpend}
            </span>
            <span className="text-xs font-medium text-zinc-400">76% of budget</span>
          </div>
        </div>
        <div className="mt-4 pt-2 border-t border-white/10 space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-zinc-400">Est. Runway Balance</span>
            <span className="text-zinc-300 font-mono font-medium">6.4 Days / $840/day</span>
          </div>
          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-white/5">
            <div className="bg-white h-full w-[76%]" />
          </div>
        </div>
      </div>
    </div>
  );
}
