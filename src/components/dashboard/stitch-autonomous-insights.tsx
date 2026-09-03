"use client";

import React, { useState } from "react";
import { Sparkles, ArrowUpRight, X } from "lucide-react";

interface InsightItem {
  id: string;
  type: "LATENCY SPIKE" | "COST TUNING" | "AUTO-SUSPEND";
  time: string;
  message: string;
  actionLabel?: string;
  secondaryLabel?: string;
  highlightColor: string;
}

const INITIAL_INSIGHTS: InsightItem[] = [
  {
    id: "ins-1",
    type: "LATENCY SPIKE",
    time: "14:02 UTC",
    message:
      "Anomaly detected in Stripe webhook ingestion. Ingestion latency surged to 840ms due to unbatched payloads.",
    actionLabel: "Inspect Trace",
    secondaryLabel: "Dismiss",
    highlightColor: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  },
  {
    id: "ins-2",
    type: "COST TUNING",
    time: "10:45 UTC",
    message:
      "Auto-indexed 3 slow query bottlenecks in Postgres DB. Reduced warehouse CPU saturation by 32%.",
    actionLabel: "Review Plan",
    secondaryLabel: "Logs",
    highlightColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  },
  {
    id: "ins-3",
    type: "AUTO-SUSPEND",
    time: "02:18 UTC",
    message:
      "Snowflake warehouse COMPUTE_XL auto-suspended after 10m zero-query idle. Saved ~$48.00.",
    actionLabel: "Dismiss",
    highlightColor: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  },
];

export function StitchAutonomousInsights() {
  const [insights, setInsights] = useState<InsightItem[]>(INITIAL_INSIGHTS);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);

  const dismissInsight = (id: string) => {
    setInsights((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-white/10 text-white border border-white/10">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Autonomous Insights
            </h2>
            <p className="text-[11px] text-zinc-400">
              Real-time ML diagnostics analysing query paths & broker health
            </p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-zinc-200 font-mono text-[11px] font-bold">
          {insights.length} NEW
        </span>
      </div>

      {/* Active toast/feedback */}
      {activeMessage && (
        <div className="mt-2 p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-xs text-emerald-300 flex items-center justify-between">
          <span>{activeMessage}</span>
          <button
            type="button"
            onClick={() => setActiveMessage(null)}
            className="text-emerald-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Insights List */}
      <div className="space-y-3 mt-3 flex-1 overflow-y-auto max-h-[300px] pr-1">
        {insights.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs font-mono">
            No unreviewed anomalies detected. All pipelines running nominal.
          </div>
        ) : (
          insights.map((ins) => (
            <div
              key={ins.id}
              className="p-3 bg-[#050505] hover:bg-[#111111] border border-white/10 rounded-lg transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${ins.highlightColor}`}
                >
                  {ins.type}
                </span>
                <span className="text-[11px] font-mono text-slate-500">{ins.time}</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{ins.message}</p>

              <div className="flex items-center gap-2 pt-1">
                {ins.actionLabel && (
                  <button
                    type="button"
                    onClick={() => {
                      if (ins.actionLabel === "Dismiss") {
                        dismissInsight(ins.id);
                      } else {
                        setActiveMessage(`Executed: ${ins.actionLabel} for ${ins.type}`);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded transition-colors"
                  >
                    <span>{ins.actionLabel}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                )}

                {ins.secondaryLabel && (
                  <button
                    type="button"
                    onClick={() => {
                      if (ins.secondaryLabel === "Dismiss") {
                        dismissInsight(ins.id);
                      } else {
                        setActiveMessage(`Viewing logs for ${ins.type}`);
                      }
                    }}
                    className="text-[11px] text-slate-400 hover:text-white px-2 py-1 transition-colors"
                  >
                    {ins.secondaryLabel}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
        <span className="text-slate-400">Autonomous Optimization</span>
        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          ACTIVE
        </span>
      </div>
    </div>
  );
}
