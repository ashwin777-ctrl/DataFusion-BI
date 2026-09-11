"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Database, 
  Plus, 
  BarChart3, 
  Layers, 
  Sparkles,
} from "lucide-react";

interface AnalyticalEmptyStateProps {
  type?: "datasets" | "charts" | "insights" | "reports";
  title?: string;
  description?: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export function AnalyticalEmptyState({
  type = "datasets",
  title,
  description,
  actionText,
  actionHref,
  onAction,
  children
}: AnalyticalEmptyStateProps) {
  const getContextualContent = () => {
    switch (type) {
      case "charts":
        return {
          defaultTitle: "No Visual Exploration Configured",
          defaultDesc: "Select dimensions and measures from the query control bar to synthesize an interactive vectorized chart.",
          icon: BarChart3,
          badge: "Query Builder Ready",
          visual: (
            <div className="w-full max-w-[280px] p-3.5 rounded-[16px] bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-sm space-y-2.5">
              <div className="flex justify-between items-center">
                <div className="h-2 w-16 bg-[#E5E5EA] dark:bg-[#2C2C2E] rounded-full" />
                <div className="h-2 w-8 bg-[#0071E3]/20 rounded-full" />
              </div>
              <div className="flex items-end gap-1.5 h-16 pt-2">
                {[35, 60, 45, 75, 90, 50].map((h, i) => (
                  <div key={i} className="flex-1 bg-[#E5E5EA]/80 dark:bg-[#2C2C2E] rounded-t-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          )
        };
      case "insights":
        return {
          defaultTitle: "Statistical Diagnostics Generating",
          defaultDesc: "Connect an active data source or run a query to trigger automatic anomaly classification and regression forecasting.",
          icon: Sparkles,
          badge: "Continuous Scanner",
          visual: (
            <div className="w-full max-w-[280px] p-3.5 rounded-[16px] bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#AF52DE] animate-pulse" />
                <div className="h-2 w-24 bg-[#E5E5EA] dark:bg-[#2C2C2E] rounded-full" />
              </div>
              <div className="h-2 w-full bg-[#F2F2F7] dark:bg-[#242426] rounded-full" />
              <div className="h-2 w-3/4 bg-[#F2F2F7] dark:bg-[#242426] rounded-full" />
            </div>
          )
        };
      case "reports":
        return {
          defaultTitle: "No Export Decks Compiled",
          defaultDesc: "Compile real-time executive dashboard snapshots into vector PDF, Excel, or JSON manifests.",
          icon: Layers,
          badge: "Publication Engine",
          visual: (
            <div className="w-full max-w-[280px] p-3.5 rounded-[16px] bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-sm space-y-2">
              <div className="flex justify-between items-center">
                <div className="h-2 w-20 bg-[#E5E5EA] dark:bg-[#2C2C2E] rounded-full" />
                <div className="h-2 w-6 bg-[#34C759]/20 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="h-10 bg-[#F2F2F7] dark:bg-[#242426] rounded-lg" />
                <div className="h-10 bg-[#F2F2F7] dark:bg-[#242426] rounded-lg" />
              </div>
            </div>
          )
        };
      case "datasets":
      default:
        return {
          defaultTitle: "No Active Datasets Connected",
          defaultDesc: "Ingest CSV/Excel workbooks or synchronize PostgreSQL schemas to ignite the DuckDB vectorized engine.",
          icon: Database,
          badge: "Zero-Latency OLAP",
          visual: (
            <div className="w-full max-w-[280px] p-3.5 rounded-[16px] bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-[10px] bg-[#0071E3]/10 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center font-bold">
                  <Database className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <div className="h-2.5 w-20 bg-[#E5E5EA] dark:bg-[#2C2C2E] rounded-full" />
                  <div className="h-2 w-14 bg-[#F2F2F7] dark:bg-[#242426] rounded-full" />
                </div>
              </div>
              <div className="h-5 w-12 bg-[#34C759]/15 rounded-full" />
            </div>
          )
        };
    }
  };

  const config = getContextualContent();
  const Icon = config.icon;

  return (
    <div className="w-full p-8 sm:p-12 rounded-[24px] bg-[#FBFBFD] dark:bg-[#121214] border border-[#E5E5EA] dark:border-[#2C2C2E] flex flex-col items-center justify-center text-center transition-all">
      {/* Visual Silhouette Demonstration */}
      <div className="mb-6 opacity-90 transition-transform hover:scale-105 duration-300">
        {config.visual}
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#0071E3]/10 text-[#0071E3] dark:text-[#0A84FF] mb-3">
        <Icon className="h-3.5 w-3.5" />
        <span>{config.badge}</span>
      </div>

      <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] max-w-md">
        {title || config.defaultTitle}
      </h3>

      <p className="mt-2 text-xs sm:text-sm text-[#86868B] max-w-md leading-relaxed">
        {description || config.defaultDesc}
      </p>

      {/* Action CTA */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {children ? (
          children
        ) : actionHref ? (
          <Link href={actionHref}>
            <Button className="rounded-full px-5 py-2 text-xs font-semibold bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-sm flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>{actionText || "Get Started"}</span>
            </Button>
          </Link>
        ) : onAction ? (
          <Button 
            onClick={onAction}
            className="rounded-full px-5 py-2 text-xs font-semibold bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-sm flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{actionText || "Get Started"}</span>
          </Button>
        ) : (
          <Link href="/app/sources">
            <Button className="rounded-full px-5 py-2 text-xs font-semibold bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-sm flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Connect Data Source</span>
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
