"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Terminal, Filter, ArrowUpRight, CheckCircle2 } from "lucide-react";

interface QueryLog {
  id: string;
  query: string;
  diagnostic: string;
  engine: string;
  durationMs: number;
  costEst: string;
  initiator: string;
}

const SAMPLE_QUERIES: QueryLog[] = [
  {
    id: "q-1",
    query: "SELECT date_trunc('day', created_at), sum(amount) FROM orders_fact...",
    diagnostic: "Full Table Scan • Missing Index on created_at",
    engine: "Snowflake-XL",
    durationMs: 1842,
    costEst: "$0.42",
    initiator: "looker_serv",
  },
  {
    id: "q-2",
    query: "INSERT INTO telemetry_archive SELECT * FROM kafka_ingress WHERE...",
    diagnostic: "Bulk Hash Partition 200-230",
    engine: "BigQuery-Pool",
    durationMs: 384,
    costEst: "$0.08",
    initiator: "airflow_sqs1",
  },
  {
    id: "q-3",
    query: "REFRESH MATERIALIZED VIEW CONCURRENTLY agg_revenue_by_geo...",
    diagnostic: "Spilled to Temp Disk (1.2GB)",
    engine: "Postgres-RDS",
    durationMs: 814,
    costEst: "$0.13",
    initiator: "dbt_runner",
  },
  {
    id: "q-4",
    query: "SELECT customer_id, count(*) FROM churn_risk_matrix WHERE status = 'active'...",
    diagnostic: "Execution Path Cached • Redis 6.2 Fast Hit",
    engine: "DuckDB-InProcess",
    durationMs: 42,
    costEst: "$0.00",
    initiator: "ml_model_d",
  },
];

export function StitchSqlProfiler() {
  const [filterMin100, setFilterMin100] = useState(false);

  const filteredQueries = filterMin100
    ? SAMPLE_QUERIES.filter((q) => q.durationMs >= 100)
    : SAMPLE_QUERIES;

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-white/10 text-white border border-white/10">
              <Terminal className="w-4 h-4" />
            </span>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Real-Time SQL Execution Profiler
            </h2>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Profiling long-running statements against active compute pools
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFilterMin100(!filterMin100)}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
            filterMin100
              ? "bg-white text-black font-semibold shadow-md"
              : "bg-[#050505] text-zinc-400 border border-white/10 hover:text-white"
          }`}
        >
          <Filter className="w-3 h-3" />
          <span>Filters {filterMin100 ? "Active (> 100ms)" : "> 100ms"}</span>
        </button>
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[11px] font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
              <th className="pb-2 font-medium">Query Snippet & Diagnostic</th>
              <th className="pb-2 font-medium">Target Engine</th>
              <th className="pb-2 font-medium">Duration</th>
              <th className="pb-2 font-medium">Cost (Est)</th>
              <th className="pb-2 font-medium">Initiator</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredQueries.map((q) => {
              const isFast = q.durationMs < 100;
              const isMedium = q.durationMs >= 100 && q.durationMs < 1000;
              const isSlow = q.durationMs >= 1000;

              return (
                <tr key={q.id} className="hover:bg-[#060e20]/60 transition-colors">
                  <td className="py-2.5 pr-3 max-w-[320px]">
                    <div className="text-slate-200 truncate font-semibold">{q.query}</div>
                    <div className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                      {isSlow && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                      {isFast && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                      <span>{q.diagnostic}</span>
                    </div>
                  </td>

                  <td className="py-2.5 pr-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 text-[11px]">
                      {q.engine}
                    </span>
                  </td>

                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold ${
                          isSlow ? "text-rose-400" : isMedium ? "text-amber-400" : "text-emerald-400"
                        }`}
                      >
                        {q.durationMs}ms
                      </span>
                      {/* Mini bar */}
                      <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className={`h-full ${
                            isSlow ? "bg-rose-400" : isMedium ? "bg-amber-400" : "bg-emerald-400"
                          }`}
                          style={{ width: `${Math.min(100, (q.durationMs / 2000) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-2.5 pr-3 text-slate-300 font-bold">{q.costEst}</td>

                  <td className="py-2.5 text-slate-400 font-mono text-[11px]">{q.initiator}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="pt-3 mt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-4 text-zinc-400">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>94% Queries Cached</span>
          </span>
          <span>Zero Deadlocks in Last 4h</span>
          <span className="hidden md:inline">Sampling: 100%</span>
        </div>

        <Link
          href="/app/prep"
          className="inline-flex items-center gap-1 text-white hover:text-zinc-300 font-semibold"
        >
          <span>Open Full SQL Studio</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
