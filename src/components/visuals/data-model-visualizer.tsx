"use client";

import { useState } from "react";
import { GitMerge, Key, Link2 } from "lucide-react";

export function DataModelVisualizer({ className = "" }: { className?: string }) {
  const [activeJoin, setActiveJoin] = useState<"customer" | "product">("customer");

  return (
    <div className={`relative w-full rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#101014] p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.8)] overflow-hidden ${className}`}>
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-black/[0.05] dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <GitMerge className="w-3.5 h-3.5" />
            </span>
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              Relational Star Schema & Automated Join Graph
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            DataFusion detects primary-to-foreign key relationships and synthesizes high-speed in-memory join views.
          </p>
        </div>

        {/* Join Selector Pills */}
        <div className="flex items-center gap-1.5 bg-black/[0.03] dark:bg-white/[0.04] p-1 rounded-full border border-black/[0.04] dark:border-white/[0.06] text-xs">
          <button
            onClick={() => setActiveJoin("customer")}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              activeJoin === "customer"
                ? "bg-white dark:bg-white/15 text-foreground font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Orders ⟷ Customers
          </button>
          <button
            onClick={() => setActiveJoin("product")}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              activeJoin === "product"
                ? "bg-white dark:bg-white/15 text-foreground font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Orders ⟷ Products
          </button>
        </div>
      </div>

      {/* Interactive ER Model Canvas */}
      <div className="pt-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Left: Dimension Tables (Cols 1-4) */}
        <div className="md:col-span-4 space-y-4">
          
          {/* Table 1: Customers Dim */}
          <div
            onClick={() => setActiveJoin("customer")}
            className={`cursor-pointer p-4 rounded-[18px] border transition-all duration-200 ${
              activeJoin === "customer"
                ? "border-blue-500/60 bg-blue-500/[0.03] dark:bg-blue-500/[0.06] shadow-[0_4px_16px_rgba(0,113,227,0.1)]"
                : "border-black/[0.06] dark:border-white/[0.08] bg-black/[0.01] dark:bg-white/[0.02] opacity-75 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/[0.04] dark:border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-bold text-foreground">customers [Dim]</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">Postgres Table</span>
            </div>
            <div className="space-y-1 text-[11px] font-mono">
              <div className={`flex items-center justify-between px-2 py-1 rounded ${activeJoin === "customer" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold" : "text-foreground"}`}>
                <span className="flex items-center gap-1"><Key className="w-3 h-3" /> customer_id</span>
                <span className="text-[10px]">PK</span>
              </div>
              <div className="flex items-center justify-between px-2 py-0.5 text-muted-foreground">
                <span>company_name</span>
                <span className="text-[10px]">VARCHAR</span>
              </div>
              <div className="flex items-center justify-between px-2 py-0.5 text-muted-foreground">
                <span>tier_level</span>
                <span className="text-[10px]">VARCHAR</span>
              </div>
            </div>
          </div>

          {/* Table 2: Products Dim */}
          <div
            onClick={() => setActiveJoin("product")}
            className={`cursor-pointer p-4 rounded-[18px] border transition-all duration-200 ${
              activeJoin === "product"
                ? "border-purple-500/60 bg-purple-500/[0.03] dark:bg-purple-500/[0.06] shadow-[0_4px_16px_rgba(175,82,222,0.1)]"
                : "border-black/[0.06] dark:border-white/[0.08] bg-black/[0.01] dark:bg-white/[0.02] opacity-75 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/[0.04] dark:border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-xs font-bold text-foreground">products [Dim]</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">Excel Workbook</span>
            </div>
            <div className="space-y-1 text-[11px] font-mono">
              <div className={`flex items-center justify-between px-2 py-1 rounded ${activeJoin === "product" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold" : "text-foreground"}`}>
                <span className="flex items-center gap-1"><Key className="w-3 h-3" /> product_id</span>
                <span className="text-[10px]">PK</span>
              </div>
              <div className="flex items-center justify-between px-2 py-0.5 text-muted-foreground">
                <span>sku_category</span>
                <span className="text-[10px]">VARCHAR</span>
              </div>
              <div className="flex items-center justify-between px-2 py-0.5 text-muted-foreground">
                <span>unit_cost</span>
                <span className="text-[10px]">DECIMAL</span>
              </div>
            </div>
          </div>

        </div>

        {/* Center: Interactive Join Relationship Wire (Cols 5-6) */}
        <div className="md:col-span-3 flex flex-col items-center justify-center text-center space-y-2 py-4">
          <div className="px-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-[11px] font-mono font-semibold text-foreground flex items-center gap-1.5 shadow-sm">
            <Link2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>1 : N RELATIONSHIP</span>
          </div>

          <div className="text-[10px] font-mono text-muted-foreground max-w-[140px]">
            {activeJoin === "customer"
              ? "orders.customer_id = customers.customer_id"
              : "orders.product_id = products.product_id"}
          </div>

          <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
            INNER JOIN (AUTO)
          </span>
        </div>

        {/* Right: Fact Table (Cols 7-12) */}
        <div className="md:col-span-5">
          <div className="p-5 rounded-[20px] bg-white dark:bg-[#15151a] border border-black/[0.08] dark:border-white/[0.12] shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.05] dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-foreground">orders [Central Fact]</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                1.42M Rows
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] font-mono">
              <div className="flex items-center justify-between px-2.5 py-1 rounded bg-black/[0.03] dark:bg-white/[0.04]">
                <span className="flex items-center gap-1.5 font-bold text-foreground">
                  <Key className="w-3 h-3 text-amber-500" /> order_id
                </span>
                <span className="text-muted-foreground text-[10px]">BIGINT (PK)</span>
              </div>

              <div className={`flex items-center justify-between px-2.5 py-1 rounded transition-colors ${
                activeJoin === "customer"
                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold"
                  : "bg-black/[0.02] dark:bg-white/[0.02] text-foreground"
              }`}>
                <span className="flex items-center gap-1.5">
                  <Link2 className="w-3 h-3" /> customer_id
                </span>
                <span className="text-[10px]">BIGINT (FK ➔ Customers)</span>
              </div>

              <div className={`flex items-center justify-between px-2.5 py-1 rounded transition-colors ${
                activeJoin === "product"
                  ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold"
                  : "bg-black/[0.02] dark:bg-white/[0.02] text-foreground"
              }`}>
                <span className="flex items-center gap-1.5">
                  <Link2 className="w-3 h-3" /> product_id
                </span>
                <span className="text-[10px]">VARCHAR (FK ➔ Products)</span>
              </div>

              <div className="flex items-center justify-between px-2.5 py-1 rounded bg-black/[0.02] dark:bg-white/[0.02]">
                <span className="text-foreground">transaction_amount</span>
                <span className="text-muted-foreground text-[10px]">DECIMAL(12,2)</span>
              </div>

              <div className="flex items-center justify-between px-2.5 py-1 rounded bg-black/[0.02] dark:bg-white/[0.02]">
                <span className="text-foreground">order_timestamp</span>
                <span className="text-muted-foreground text-[10px]">TIMESTAMP</span>
              </div>
            </div>

            <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">In-Memory Parquet View:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">Ready to Query</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
