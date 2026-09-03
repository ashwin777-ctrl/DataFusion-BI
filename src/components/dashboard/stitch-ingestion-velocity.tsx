"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const INGESTION_TIMESERIES = [
  { time: "14:00:00", kafka: 26.2, snowflake: 13.5, postgres: 4.8 },
  { time: "14:15:00", kafka: 29.8, snowflake: 15.1, postgres: 5.2 },
  { time: "14:30:00", kafka: 27.4, snowflake: 14.2, postgres: 5.1 },
  { time: "14:45:00", kafka: 32.1, snowflake: 16.8, postgres: 5.9 },
  { time: "15:00:00", kafka: 28.4, snowflake: 14.1, postgres: 5.3 },
  { time: "15:15:00", kafka: 31.0, snowflake: 15.4, postgres: 5.6 },
  { time: "15:30:00", kafka: 34.2, snowflake: 17.0, postgres: 6.2 },
  { time: "15:45:00", kafka: 29.5, snowflake: 14.9, postgres: 5.4 },
  { time: "16:00:00", kafka: 28.4, snowflake: 14.1, postgres: 5.3 },
];

export function StitchIngestionVelocity() {
  const [activeSeries, setActiveSeries] = useState({
    kafka: true,
    snowflake: true,
    postgres: true,
  });

  const toggleSeries = (key: keyof typeof activeSeries) => {
    setActiveSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between overflow-hidden">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <h2 className="text-base font-semibold text-white tracking-tight">
              Multi-Engine Ingestion Velocity & Queue Depth
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time combined event stream cross-referenced by partition
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-black border border-white/15 rounded-lg flex items-center gap-2">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase">Throughput</span>
            <span className="text-sm font-mono font-bold text-white">47,883 ev/s</span>
          </div>
        </div>
      </div>

      {/* Series Toggles */}
      <div className="flex flex-wrap items-center gap-2 pt-3">
        <button
          type="button"
          onClick={() => toggleSeries("kafka")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
            activeSeries.kafka
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "bg-slate-900/60 text-slate-500 border border-slate-800"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          Kafka Pub/Sub (28.4k/s)
        </button>

        <button
          type="button"
          onClick={() => toggleSeries("snowflake")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
            activeSeries.snowflake
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "bg-slate-900/60 text-slate-500 border border-slate-800"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Snowflake Pipe (14.1k/s)
        </button>

        <button
          type="button"
          onClick={() => toggleSeries("postgres")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
            activeSeries.postgres
              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
              : "bg-slate-900/60 text-slate-500 border border-slate-800"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          Postgres RDS CDC (5.3k/s)
        </button>

        <div className="ml-auto hidden md:flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span>Sampling: <span className="text-emerald-400 font-bold">100% Real-Time</span></span>
        </div>
      </div>

      {/* Main Flow Chart */}
      <div className="h-64 w-full mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={INGESTION_TIMESERIES} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="time" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fill: "#64748b", fontSize: 11 }} unit="k/s" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0b1326",
                borderColor: "rgba(56, 189, 248, 0.3)",
                borderRadius: "8px",
                color: "#f8fafc",
                fontSize: "12px",
                fontFamily: "monospace",
              }}
            />
            {activeSeries.kafka && (
              <Area
                type="monotone"
                dataKey="kafka"
                name="Kafka Pub/Sub"
                stroke="#38bdf8"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#cyanGrad)"
              />
            )}
            {activeSeries.snowflake && (
              <Area
                type="monotone"
                dataKey="snowflake"
                name="Snowflake Pipe"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#emeraldGrad)"
              />
            )}
            {activeSeries.postgres && (
              <Area
                type="monotone"
                dataKey="postgres"
                name="Postgres CDC"
                stroke="#6366f1"
                strokeWidth={1.8}
                fillOpacity={1}
                fill="url(#indigoGrad)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Telemetry Summary Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 mt-2 border-t border-white/10">
        <div className="bg-[#050505] p-2.5 rounded-lg border border-white/10">
          <span className="text-[10px] font-mono uppercase text-zinc-400 block">Backpressure</span>
          <span className="text-xs font-mono font-bold text-emerald-400">0.04% (Nominal)</span>
        </div>
        <div className="bg-[#050505] p-2.5 rounded-lg border border-white/10">
          <span className="text-[10px] font-mono uppercase text-zinc-400 block">Partitions Active</span>
          <span className="text-xs font-mono font-bold text-white">512 / 512 Online</span>
        </div>
        <div className="bg-[#050505] p-2.5 rounded-lg border border-white/10">
          <span className="text-[10px] font-mono uppercase text-zinc-400 block">Dead Letter Queue</span>
          <span className="text-xs font-mono font-bold text-zinc-300">0 Messages</span>
        </div>
        <div className="bg-[#050505] p-2.5 rounded-lg border border-white/10">
          <span className="text-[10px] font-mono uppercase text-zinc-400 block">Schema Violations</span>
          <span className="text-xs font-mono font-bold text-emerald-400">0 Logged / Enforced</span>
        </div>
      </div>
    </div>
  );
}
