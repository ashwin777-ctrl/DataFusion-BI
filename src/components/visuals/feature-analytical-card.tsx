"use client";

import { 
  Database, 
  ShieldCheck, 
  FileSpreadsheet,
  ArrowRight,
  FileText
} from "lucide-react";

export type FeatureType = "simd" | "rls" | "insights" | "ingest" | "joins" | "reports";

interface FeatureAnalyticalCardProps {
  type: FeatureType;
  title: string;
  badge?: string;
  description: string;
  specs?: string;
}

export function FeatureAnalyticalCard({
  type,
  title,
  badge,
  description,
  specs
}: FeatureAnalyticalCardProps) {
  const renderMicroVisualization = () => {
    switch (type) {
      case "simd":
        return (
          <div className="w-full h-20 rounded-[14px] bg-[#FBFBFD] dark:bg-[#151518] border border-[#E5E5EA] dark:border-[#2C2C2E] p-3 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px] font-mono text-[#86868B]">
              <span>SIMD LANE 0-3</span>
              <span className="text-[#34C759]">45M rows/s</span>
            </div>
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-[#E5E5EA] dark:bg-[#2C2C2E] rounded-full overflow-hidden">
                <div className="h-full bg-[#0071E3] w-[85%] rounded-full" />
              </div>
              <div className="h-2 w-full bg-[#E5E5EA] dark:bg-[#2C2C2E] rounded-full overflow-hidden">
                <div className="h-full bg-[#34C759] w-[94%] rounded-full" />
              </div>
            </div>
          </div>
        );
      case "rls":
        return (
          <div className="w-full h-20 rounded-[14px] bg-[#FBFBFD] dark:bg-[#151518] border border-[#E5E5EA] dark:border-[#2C2C2E] p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#34C759]/10 text-[#34C759] flex items-center justify-center font-bold">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="text-[11px] font-mono">
                <div className="text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold">tenant_id = ?</div>
                <div className="text-[#86868B]">Isolation: Strict</div>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#34C759]/15 text-[#34C759] font-medium">
              100% Passed
            </span>
          </div>
        );
      case "insights":
        return (
          <div className="w-full h-20 rounded-[14px] bg-[#FBFBFD] dark:bg-[#151518] border border-[#E5E5EA] dark:border-[#2C2C2E] p-3 flex items-center justify-between">
            <svg viewBox="0 0 120 40" className="w-24 h-10 overflow-visible">
              <path
                d="M 0,30 Q 30,25 50,15 T 80,22 T 120,5"
                fill="none"
                stroke="#AF52DE"
                strokeWidth="2"
              />
              <circle cx="50" cy="15" r="3" fill="#FF3B30" />
            </svg>
            <div className="text-right">
              <div className="text-[10px] font-mono text-[#FF453A] font-bold">+38.4% Spike</div>
              <div className="text-[9px] font-mono text-[#86868B]">p &lt; 0.001</div>
            </div>
          </div>
        );
      case "ingest":
        return (
          <div className="w-full h-20 rounded-[14px] bg-[#FBFBFD] dark:bg-[#151518] border border-[#E5E5EA] dark:border-[#2C2C2E] p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <ArrowRight className="h-3 w-3 text-[#86868B]" />
              <div className="h-8 w-8 rounded-lg bg-[#34C759]/10 text-[#34C759] flex items-center justify-center">
                <Database className="h-4 w-4" />
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#86868B]">
              Snappy Parquet
            </span>
          </div>
        );
      case "joins":
        return (
          <div className="w-full h-20 rounded-[14px] bg-[#FBFBFD] dark:bg-[#151518] border border-[#E5E5EA] dark:border-[#2C2C2E] p-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="px-2 py-1 rounded bg-white dark:bg-[#202024] border border-[#E5E5EA] dark:border-[#2C2C2E] font-semibold text-[#0071E3]">
                sales_fact
              </span>
              <span className="text-[#86868B]">1:N</span>
              <span className="px-2 py-1 rounded bg-white dark:bg-[#202024] border border-[#E5E5EA] dark:border-[#2C2C2E] font-semibold text-[#AF52DE]">
                dim_customer
              </span>
            </div>
          </div>
        );
      case "reports":
      default:
        return (
          <div className="w-full h-20 rounded-[14px] bg-[#FBFBFD] dark:bg-[#151518] border border-[#E5E5EA] dark:border-[#2C2C2E] p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#FF9500]" />
              <div className="text-[11px] font-mono">
                <div className="text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold">Q3_Executive.pdf</div>
                <div className="text-[#86868B]">Vector CMYK Ready</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-[#34C759] font-medium">Signed</span>
          </div>
        );
    }
  };

  return (
    <div className="p-6 rounded-[20px] bg-white dark:bg-[#101012] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
            {title}
          </h3>
          {badge && (
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#636366] dark:text-[#AEAEB2]">
              {badge}
            </span>
          )}
        </div>

        <p className="text-xs text-[#86868B] leading-relaxed mb-4">
          {description}
        </p>
      </div>

      {/* Embedded Purposeful Micro-Visualization */}
      <div className="pt-1">
        {renderMicroVisualization()}
      </div>

      {specs && (
        <div className="pt-2 border-t border-[#E5E5EA]/60 dark:border-[#2C2C2E]/60 text-[11px] font-mono text-[#86868B]">
          {specs}
        </div>
      )}
    </div>
  );
}
