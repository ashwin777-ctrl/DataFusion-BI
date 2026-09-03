"use client";

import React from "react";
import { Clock, ArrowUpRight } from "lucide-react";

export function StitchLatencyHeatmap() {
  const BRACKETS = [
    { label: "> 2.5s", pct: "0.4%", color: "bg-rose-500", count: 2 },
    { label: "1.0s - 2.5s", pct: "2.3%", color: "bg-amber-500", count: 4 },
    { label: "500ms - 1s", pct: "4.6%", color: "bg-cyan-500", count: 6 },
    { label: "100ms - 500ms", pct: "26.2%", color: "bg-emerald-500/80", count: 10 },
    { label: "< 100ms (Opt)", pct: "66.5%", color: "bg-emerald-400", count: 12 },
  ];

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-white/10 text-white border border-white/10">
              <Clock className="w-4 h-4" />
            </span>
            <h2 className="text-base font-semibold text-white tracking-tight">
              24h Latency Distribution Heatmap
            </h2>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Query duration density across 24 hourly cluster execution windows
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs font-mono font-bold text-emerald-400">92% &lt; 200ms</span>
        </div>
      </div>

      {/* Heatmap Rows */}
      <div className="space-y-3 mt-4">
        {BRACKETS.map((b) => (
          <div key={b.label} className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-400">{b.label}</span>
              <span className="text-zinc-200 font-bold">{b.pct}</span>
            </div>
            {/* Grid ticks */}
            <div className="flex gap-1">
              {Array.from({ length: 16 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3 flex-1 rounded-sm ${
                    i < b.count ? b.color : "bg-zinc-900 border border-white/5"
                  } transition-all`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-4 mt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
        <span className="text-zinc-400">
          Mean Execution: <span className="text-white font-bold">78.4ms</span>
        </span>
        <button
          type="button"
          className="text-white hover:text-zinc-300 font-semibold inline-flex items-center gap-1"
        >
          <span>Inspect Outliers</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
