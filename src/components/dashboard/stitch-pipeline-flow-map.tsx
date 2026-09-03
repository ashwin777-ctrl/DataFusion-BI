"use client";

import React, { useState } from "react";
import { Radio, Database, Cpu, Sparkles, Check } from "lucide-react";

export function StitchPipelineFlowMap() {
  const [appliedOptimization, setAppliedOptimization] = useState(false);
  const [suspendedPool, setSuspendedPool] = useState(false);

  return (
    <div className="space-y-6">
      {/* Visual Pipeline Topology Canvas */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-white/10 text-white border border-white/10">
                <Cpu className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Pipeline Topology & Real-Time Flow Map
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Zero-copy event streaming from Ingress brokers through DataFusion vectorized query kernels into OLAP storage.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              FEED: ACTIVE (0.14ms)
            </span>
          </div>
        </div>

        {/* 3-Stage Diagram: Ingress -> Engine -> Sinks */}
        <div className="py-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center relative">
          {/* Column 1: Ingestion Sources */}
          <div className="space-y-4">
            <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 font-semibold px-1">
              Ingestion Sources
            </div>

            {/* Source 1: Kafka */}
            <div className="p-4 bg-[#050505] border border-white/10 rounded-xl hover:border-white/20 transition-all flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-white">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Apache Kafka</h4>
                  <span className="text-[10px] font-mono text-zinc-300">28.4k/s pub</span>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>

            {/* Source 2: AWS Kinesis */}
            <div className="p-4 bg-[#050505] border border-white/10 rounded-xl hover:border-white/20 transition-all flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-white">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">AWS Kinesis</h4>
                  <span className="text-[10px] font-mono text-zinc-300">14.1k/s pub</span>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-zinc-300 animate-pulse" />
            </div>

            {/* Source 3: Postgres CDC */}
            <div className="p-4 bg-[#050505] border border-white/10 rounded-xl hover:border-white/20 transition-all flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-white">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Postgres CDC</h4>
                  <span className="text-[10px] font-mono text-emerald-400">5.3k/s pub</span>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
          </div>

          {/* Column 2: DataFusion Core Engine */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative p-6 bg-[#050505] border-2 border-white/20 rounded-2xl shadow-2xl shadow-black/80 text-center w-full max-w-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white mx-auto animate-pulse">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold">
                  Core Vector Engine
                </span>
                <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                  DataFusion V8 Engine
                </h3>
              </div>
              <div className="pt-2 border-t border-white/10 space-y-1">
                <div className="text-xs font-mono text-zinc-300">
                  Throughput: <span className="text-white font-bold">47,883 ev/s</span>
                </div>
                <div className="text-[11px] font-mono text-emerald-400">
                  Vectorized Scan: 0.14ms avg
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Destination Warehouses */}
          <div className="space-y-4">
            <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 font-semibold px-1">
              Destination Sinks
            </div>

            {/* Sink 1: Snowflake */}
            <div className="p-4 bg-[#050505] border border-white/10 rounded-xl hover:border-white/20 transition-all flex items-center justify-between shadow-lg">
              <div>
                <h4 className="text-xs font-semibold text-white">Snowflake Lake</h4>
                <span className="text-[10px] font-mono text-zinc-400">10,420 partitions</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">14ms ping</span>
            </div>

            {/* Sink 2: ClickHouse */}
            <div className="p-4 bg-[#050505] border border-white/10 rounded-xl hover:border-white/20 transition-all flex items-center justify-between shadow-lg">
              <div>
                <h4 className="text-xs font-semibold text-white">ClickHouse OLAP</h4>
                <span className="text-[10px] font-mono text-zinc-400">Realtime shards</span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400">8ms ping</span>
            </div>

            {/* Sink 3: BigQuery */}
            <div className="p-4 bg-[#050505] border border-white/10 rounded-xl hover:border-white/20 transition-all flex items-center justify-between shadow-lg">
              <div>
                <h4 className="text-xs font-semibold text-white">BigQuery Enterprise</h4>
                <span className="text-[10px] font-mono text-zinc-400">1.12PB indexed</span>
              </div>
              <span className="text-xs font-mono font-bold text-zinc-300">22ms ping</span>
            </div>
          </div>
        </div>

        {/* Telemetry Footer Band */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-white/10">
          <div>
            <span className="text-[10px] font-mono uppercase text-zinc-400 block">Total Ingest (24h)</span>
            <span className="text-sm font-mono font-bold text-white">4.82 Billion</span>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-zinc-400 block">Backpressure Rate</span>
            <span className="text-sm font-mono font-bold text-emerald-400">0.008% Nominal</span>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-zinc-400 block">Active Model Partitions</span>
            <span className="text-sm font-mono font-bold text-white">1,024 / 1,024 (100% OK)</span>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-zinc-400 block">Dead-Letter Queue</span>
            <span className="text-sm font-mono font-bold text-zinc-300">0 Dropped (Safe)</span>
          </div>
        </div>
      </div>

      {/* Autonomous Copilot Card */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-white/10 text-white border border-white/10">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-semibold text-white">Autonomous Copilot Recommendations</h3>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-semibold">AI ACTIVE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Action 1 */}
          <div className="p-4 bg-[#050505] border border-white/10 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-white border border-white/15">
                INDEX TUNING
              </span>
              <span className="text-[11px] font-mono text-zinc-400">Impact: -32% CPU</span>
            </div>
            <p className="text-xs text-zinc-300">
              Heavy table scan on <code className="text-white font-semibold">billing_events</code>. Create compound partition index on <code className="text-white font-semibold">(tenant_id, created_at)</code>.
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-mono text-emerald-400 font-semibold">Est: +$120/mo saved</span>
              <button
                type="button"
                disabled={appliedOptimization}
                onClick={() => setAppliedOptimization(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all disabled:opacity-50"
              >
                {appliedOptimization ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Applied</span>
                  </>
                ) : (
                  <span>Apply Optimization</span>
                )}
              </button>
            </div>
          </div>

          {/* Action 2 */}
          <div className="p-4 bg-[#050505] border border-white/10 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                IDLE WAREHOUSE
              </span>
              <span className="text-[11px] font-mono text-zinc-400">Idle: 15 Min</span>
            </div>
            <p className="text-xs text-zinc-300">
              Cluster <code className="text-amber-300">COMPUTE_XL</code> has had 0 tasks since 14:45 UTC. Auto-suspension recommended.
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-mono text-zinc-400">Conserving 32 VCPUs</span>
              <button
                type="button"
                disabled={suspendedPool}
                onClick={() => setSuspendedPool(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all disabled:opacity-50 border border-white/10"
              >
                {suspendedPool ? <span>Suspended</span> : <span>Suspend Pool</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
