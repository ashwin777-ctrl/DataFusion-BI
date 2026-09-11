"use client";

import { useState } from "react";
import { TrendingUp, Activity } from "lucide-react";

export function AppleHeroWorkspace({ className = "" }: { className?: string }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(4);

  // High-fidelity analytical points for the interactive bezier curve
  const dataPoints = [
    { label: "Q1", value: 2.4, display: "$2.41M", latency: "1.4ms" },
    { label: "Q2", value: 2.8, display: "$2.85M", latency: "1.2ms" },
    { label: "Q3", value: 3.6, display: "$3.62M", latency: "1.5ms" },
    { label: "Q4", value: 4.1, display: "$4.10M", latency: "1.3ms" },
    { label: "Current", value: 4.82, display: "$4.82M", latency: "1.8ms" },
  ];

  // SVG coordinate calculations for 500x200 canvas
  const points = [
    { x: 50, y: 150 },
    { x: 145, y: 130 },
    { x: 245, y: 95 },
    { x: 345, y: 70 },
    { x: 445, y: 35 },
  ] as const;

  const p0 = points[0];
  const p1 = points[1];
  const p2 = points[2];
  const p3 = points[3];
  const p4 = points[4];

  const svgPath = `M ${p0.x} ${p0.y} C 100 145, 120 135, ${p1.x} ${p1.y} C 190 120, 210 105, ${p2.x} ${p2.y} C 290 85, 310 75, ${p3.x} ${p3.y} C 390 65, 410 45, ${p4.x} ${p4.y}`;
  const areaPath = `${svgPath} L ${p4.x} 180 L ${p0.x} 180 Z`;

  const activePoint = (hoverIndex !== null ? dataPoints[hoverIndex] : dataPoints[4]) ?? dataPoints[0]!;
  const activeCoord = (hoverIndex !== null ? points[hoverIndex] : points[4]) ?? points[0]!;

  return (
    <div className={`relative w-full select-none ${className}`}>
      {/* Ambient background soft glow */}
      <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-[32px] blur-2xl pointer-events-none opacity-80 dark:opacity-60" />

      {/* Main Apple-Grade Studio Glass Surface */}
      <div className="relative rounded-[24px] border border-black/[0.08] dark:border-white/[0.12] bg-white/90 dark:bg-[#101014]/90 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden transition-all duration-300">
        
        {/* Studio Window Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.05] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/80 dark:bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 dark:bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80 dark:bg-emerald-500/80" />
            <span className="ml-2 text-[11px] font-mono font-medium text-muted-foreground">
              workspace / live-telemetry.duckdb
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              VECTORIZED OLAP
            </span>
          </div>
        </div>

        {/* Analytics Studio Body */}
        <div className="p-6 space-y-6">
          {/* Metric Summary Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Consolidated Net Run-Rate
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  REAL-TIME SYNC
                </span>
              </div>
              <div className="flex items-baseline gap-3 mt-1.5">
                <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                  {activePoint.display}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <TrendingUp className="w-3.5 h-3.5" /> +18.4% YoY
                </span>
              </div>
            </div>

            {/* Quick Dimension Filter Pills */}
            <div className="flex items-center gap-1.5 bg-black/[0.03] dark:bg-white/[0.04] p-1 rounded-full border border-black/[0.04] dark:border-white/[0.06] text-xs">
              <span className="px-2.5 py-1 rounded-full bg-white dark:bg-white/15 text-foreground font-semibold shadow-sm">
                Quarterly
              </span>
              <span className="px-2.5 py-1 rounded-full text-muted-foreground hover:text-foreground">
                Monthly
              </span>
              <span className="px-2.5 py-1 rounded-full text-muted-foreground hover:text-foreground">
                Cohort
              </span>
            </div>
          </div>

          {/* Interactive SVG Smooth Area Chart */}
          <div className="relative h-[190px] w-full pt-2">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 500 190"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="appleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0071E3" stopOpacity="0.28" />
                  <stop offset="60%" stopColor="#0071E3" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#0071E3" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0071E3" />
                  <stop offset="60%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#34C759" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              <line x1="30" y1="50" x2="470" y2="50" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="4 4" />
              <line x1="30" y1="100" x2="470" y2="100" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="4 4" />
              <line x1="30" y1="150" x2="470" y2="150" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="4 4" />

              {/* Area fill */}
              <path d={areaPath} fill="url(#appleGradient)" />

              {/* Curve Stroke */}
              <path
                d={svgPath}
                fill="none"
                stroke="url(#strokeGradient)"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Vertical Crosshair Line */}
              {activeCoord && (
                <line
                  x1={activeCoord.x}
                  y1="25"
                  x2={activeCoord.x}
                  y2="175"
                  stroke="#0071E3"
                  strokeOpacity="0.4"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              )}

              {/* Data Points */}
              {points.map((p, idx) => {
                const isActive = hoverIndex === idx;
                return (
                  <g
                    key={idx}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverIndex(idx)}
                  >
                    {/* Hover hotspot */}
                    <circle cx={p.x} cy={p.y} r="18" fill="transparent" />
                    {/* Ring glow */}
                    {isActive && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="8"
                        fill="#0071E3"
                        fillOpacity="0.25"
                        className="animate-ping"
                      />
                    )}
                    {/* Data circle */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isActive ? "5" : "3.5"}
                      className={`transition-all duration-150 ${
                        isActive
                          ? "fill-white stroke-[#0071E3] stroke-[2.5]"
                          : "fill-[#0071E3] dark:fill-white"
                      }`}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Floating Tooltip Indicator */}
            {activeCoord && (
              <div
                className="absolute z-20 pointer-events-none transition-all duration-200 -translate-x-1/2 -translate-y-12"
                style={{
                  left: `${(activeCoord.x / 500) * 100}%`,
                  top: `${(activeCoord.y / 190) * 100}%`,
                }}
              >
                <div className="px-2.5 py-1 rounded-full bg-zinc-900/90 dark:bg-white text-white dark:text-zinc-900 text-[11px] font-mono font-semibold shadow-lg backdrop-blur-md flex items-center gap-1.5">
                  <span>{activePoint.label}:</span>
                  <span className="text-emerald-400 dark:text-emerald-600">{activePoint.display}</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Analytical Ribbon */}
          <div className="pt-4 border-t border-black/[0.05] dark:border-white/[0.06] grid grid-cols-3 gap-3">
            <div className="p-3 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                P99 Execution
              </span>
              <span className="text-base font-bold font-mono tabular-nums text-foreground mt-0.5 block">
                1.84ms
              </span>
            </div>
            <div className="p-3 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Tenant Isolation
              </span>
              <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                RLS Verified
              </span>
            </div>
            <div className="p-3 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Parquet Ratio
              </span>
              <span className="text-base font-bold font-mono tabular-nums text-foreground mt-0.5 block">
                8.4x Compact
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Subtle Floating Companion Pill Card (Bottom Right Depth Element) */}
      <div className="hidden sm:flex absolute -bottom-4 -right-4 z-20 items-center gap-2.5 px-4 py-2.5 rounded-full bg-white/95 dark:bg-[#18181c]/95 border border-black/[0.08] dark:border-white/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs">
          <Activity className="w-3.5 h-3.5" />
        </span>
        <div className="text-xs">
          <span className="font-semibold text-foreground">4.82B Records Evaluated</span>
          <span className="text-muted-foreground block text-[10px] font-mono">Zero serialization lag</span>
        </div>
      </div>
    </div>
  );
}
