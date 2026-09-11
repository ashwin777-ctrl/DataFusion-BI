"use client";

import { Database, FileSpreadsheet, Cpu, CheckCircle2, Zap } from "lucide-react";

export function DataIngestionFlow({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-full rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#101014] p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.8)] overflow-hidden ${className}`}>
      {/* Subtle Grid Ambient Texture */}
      <div className="absolute inset-0 bg-grid-pattern opacity-15 pointer-events-none" />

      {/* Header Info */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-black/[0.05] dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Zap className="w-3.5 h-3.5" />
            </span>
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              Automated Data Ingestion & Sanitization Pipeline
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Raw relational tables and unstructured workbooks are automatically normalized into high-density columnar Parquet tables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE PIPELINE
          </span>
        </div>
      </div>

      {/* 3-Stage Diagram: Sources ➔ Engine ➔ Analytics */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-11 gap-6 items-center pt-8">
        
        {/* Left: Input Sources (Columns 1-4) */}
        <div className="lg:col-span-4 space-y-3.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold px-1">
            Incoming Data Streams
          </div>

          {/* Source 1: PostgreSQL */}
          <div className="group p-4 rounded-[16px] bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] hover:border-blue-500/40 transition-all duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Database className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">PostgreSQL 16 DB</h4>
                  <span className="text-[10px] font-mono text-muted-foreground block">
                    Tables: orders, accounts • Port 5434
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Active
              </span>
            </div>
          </div>

          {/* Source 2: Excel & CSV */}
          <div className="group p-4 rounded-[16px] bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] hover:border-emerald-500/40 transition-all duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Excel & CSV Workbooks</h4>
                  <span className="text-[10px] font-mono text-muted-foreground block">
                    .xlsx, .csv • Type Auto-Inference
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Parsed
              </span>
            </div>
          </div>
        </div>

        {/* Center: Connectors & Transition (Column 5) */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center py-2">
          <div className="w-full flex items-center justify-center gap-2 text-muted-foreground">
            <div className="hidden lg:block h-0.5 flex-1 bg-gradient-to-r from-blue-500/40 to-indigo-500/60" />
            <div className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] font-mono font-semibold flex items-center gap-1.5 whitespace-nowrap">
              <Cpu className="w-3.5 h-3.5" />
              <span>DuckDB Vectorizer</span>
            </div>
            <div className="hidden lg:block h-0.5 flex-1 bg-gradient-to-r from-indigo-500/60 to-purple-500/40" />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground mt-2">
            Zero-Copy Snappy Compression
          </span>
        </div>

        {/* Right: Consolidated Output (Columns 6-11) */}
        <div className="lg:col-span-4 space-y-3.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold px-1">
            Optimized Analytical Store
          </div>

          <div className="p-4 rounded-[16px] bg-white dark:bg-[#15151a] border border-black/[0.08] dark:border-white/[0.12] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-semibold text-foreground">Unified Parquet View</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                1.42M Rows / 12MB
              </span>
            </div>

            {/* Mini Column Type Inspector */}
            <div className="space-y-1 text-[11px] font-mono">
              <div className="flex justify-between px-2 py-1 rounded bg-black/[0.03] dark:bg-white/[0.04]">
                <span className="text-foreground">order_id</span>
                <span className="text-muted-foreground">BIGINT (PK)</span>
              </div>
              <div className="flex justify-between px-2 py-1 rounded bg-black/[0.03] dark:bg-white/[0.04]">
                <span className="text-foreground">transaction_val</span>
                <span className="text-muted-foreground">DECIMAL(12,2)</span>
              </div>
              <div className="flex justify-between px-2 py-1 rounded bg-black/[0.03] dark:bg-white/[0.04]">
                <span className="text-foreground">customer_cohort</span>
                <span className="text-muted-foreground">VARCHAR(64)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Ready for Sub-Second SQL
              </span>
              <span className="font-mono">P99 &lt; 2ms</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
