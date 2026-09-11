"use client";

import { useState } from "react";
import { 
  FileText, 
  Download, 
  Share2, 
  Printer, 
  CheckCircle2, 
  Table2, 
  BarChart2, 
  FileSpreadsheet
} from "lucide-react";

interface ReportPage {
  id: number;
  title: string;
  subtitle: string;
  category: string;
  date: string;
  status: string;
}

const REPORT_PAGES: ReportPage[] = [
  {
    id: 1,
    title: "Executive Q3 Revenue & Pipeline Briefing",
    subtitle: "Automated Rollup for Board of Directors & C-Suite",
    category: "Financial Analytics",
    date: "September 11, 2026",
    status: "Verified & Signed"
  },
  {
    id: 2,
    title: "DuckDB Vector Ingestion & Latency Audit",
    subtitle: "Hardware SIMD Execution & Parquet Compression",
    category: "Infrastructure Telemetry",
    date: "September 10, 2026",
    status: "Telemetry Passed"
  },
  {
    id: 3,
    title: "SOC-2 Type II Multi-Tenant Compliance Log",
    subtitle: "Row-Level Security Proof & PII Masking Certification",
    category: "Security & Governance",
    date: "September 08, 2026",
    status: "100% Compliant"
  }
];

export function ReportDeckVisualizer() {
  const [activePage, setActivePage] = useState<number>(1);
  const current = REPORT_PAGES.find(p => p.id === activePage) || REPORT_PAGES[0]!;

  return (
    <div className="w-full rounded-[24px] bg-white dark:bg-[#101012] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden">
      {/* Header Bar */}
      <div className="px-6 sm:px-8 py-5 border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FBFBFD] dark:bg-[#151518]">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FF9500]/10 text-[#FF9500]">
              <FileText className="h-3 w-3" />
              Automated Publications
            </span>
            <span className="text-xs text-[#86868B]">Vector PDF & Multi-Format Reports</span>
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] mt-1">
            Executive Report Deck Visualizer
          </h3>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-full border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F5F5F7] flex items-center gap-1.5 transition-all">
            <Share2 className="h-3.5 w-3.5 text-[#86868B]" />
            <span>Share Deck</span>
          </button>
          <button className="px-3.5 py-1.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm">
            <Download className="h-3.5 w-3.5" />
            <span>Export Vector PDF</span>
          </button>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Report Deck Selector & Thumbnails */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-mono text-[#86868B] uppercase tracking-wider mb-2">
              Generated Artifacts (3 Pages)
            </div>
            
            {REPORT_PAGES.map((page) => {
              const isSelected = page.id === activePage;
              return (
                <button
                  key={page.id}
                  onClick={() => setActivePage(page.id)}
                  className={`w-full text-left p-4 rounded-[18px] border transition-all flex flex-col gap-2 ${
                    isSelected
                      ? "bg-[#0071E3]/5 dark:bg-[#0A84FF]/10 border-[#0071E3] dark:border-[#0A84FF] shadow-sm"
                      : "bg-[#FBFBFD] dark:bg-[#161618] border-[#E5E5EA] dark:border-[#2C2C2E] hover:border-[#D1D1D6] hover:bg-white dark:hover:bg-[#1C1C1E]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-[#86868B]">
                      PAGE 0{page.id}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      isSelected ? "bg-[#0071E3] text-white" : "bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#636366] dark:text-[#AEAEB2]"
                    }`}>
                      {page.category}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] line-clamp-1">
                    {page.title}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#86868B] pt-1 border-t border-[#E5E5EA]/60 dark:border-[#2C2C2E]/60">
                    <span>{page.date}</span>
                    <span className="text-[#34C759] flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3 w-3" />
                      {page.status}
                    </span>
                  </div>
                </button>
              );
            })}

            <div className="pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between text-xs text-[#86868B]">
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-[#34C759]" />
                <span>Auto-export to Excel</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Printer className="h-4 w-4 text-[#0071E3] dark:text-[#0A84FF]" />
                <span>CMYK Print Ready</span>
              </div>
            </div>
          </div>

          {/* Right Column: Layered 2.5D Report Paper Preview */}
          <div className="lg:col-span-8 relative">
            {/* Ambient Background Sheet 2 */}
            <div className="absolute inset-x-4 top-2 bottom-0 bg-[#E5E5EA] dark:bg-[#1C1C1E] rounded-[22px] transform translate-y-3 opacity-40 -z-10" />
            
            {/* Ambient Background Sheet 1 */}
            <div className="absolute inset-x-2 top-1 bottom-0 bg-[#F2F2F7] dark:bg-[#242426] rounded-[22px] transform translate-y-1.5 opacity-70 -z-10" />

            {/* Foreground Main Active Document Sheet */}
            <div className="relative p-6 sm:p-8 rounded-[20px] bg-white dark:bg-[#18181A] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
              {/* Document Header */}
              <div className="flex items-start justify-between border-b border-[#E5E5EA] dark:border-[#2C2C2E] pb-5 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                      DATAFUSION BI
                    </span>
                    <span className="text-xs text-[#86868B]">·</span>
                    <span className="text-xs text-[#86868B] font-mono">CONFIDENTIAL REPORT</span>
                  </div>
                  <h4 className="text-base sm:text-xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] mt-1">
                    {current.title}
                  </h4>
                  <p className="text-xs text-[#86868B] mt-0.5">
                    {current.subtitle}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-semibold text-[#0071E3] dark:text-[#0A84FF]">
                    DOC-{current.id}084-26
                  </div>
                  <div className="text-[11px] text-[#86868B] mt-0.5">
                    {current.date}
                  </div>
                </div>
              </div>

              {/* Document Body: Simulated Analytics Layout */}
              <div className="space-y-6">
                {/* Micro Metric Ribbon */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-[14px] bg-[#FBFBFD] dark:bg-[#121214] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                    <div className="text-[11px] text-[#86868B]">Net Revenue Run-rate</div>
                    <div className="text-base sm:text-lg font-bold text-[#1D1D1F] dark:text-[#F5F5F7] font-mono mt-0.5">
                      $2,482,900
                    </div>
                    <div className="text-[10px] text-[#34C759] font-medium mt-0.5">+24.8% YoY</div>
                  </div>
                  <div className="p-3.5 rounded-[14px] bg-[#FBFBFD] dark:bg-[#121214] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                    <div className="text-[11px] text-[#86868B]">Avg Ingest Latency</div>
                    <div className="text-base sm:text-lg font-bold text-[#1D1D1F] dark:text-[#F5F5F7] font-mono mt-0.5">
                      3.84 ms
                    </div>
                    <div className="text-[10px] text-[#34C759] font-medium mt-0.5">DuckDB SIMD</div>
                  </div>
                  <div className="p-3.5 rounded-[14px] bg-[#FBFBFD] dark:bg-[#121214] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                    <div className="text-[11px] text-[#86868B]">Tenant RLS Status</div>
                    <div className="text-base sm:text-lg font-bold text-[#1D1D1F] dark:text-[#F5F5F7] font-mono mt-0.5">
                      100% Pass
                    </div>
                    <div className="text-[10px] text-[#0071E3] dark:text-[#0A84FF] font-medium mt-0.5">Zero Leakage</div>
                  </div>
                </div>

                {/* Simulated Chart & Mini Table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mini Bar Chart */}
                  <div className="p-4 rounded-[16px] bg-[#FBFBFD] dark:bg-[#121214] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                    <div className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-3 flex items-center justify-between">
                      <span>Monthly Cohort Growth</span>
                      <BarChart2 className="h-3.5 w-3.5 text-[#86868B]" />
                    </div>
                    <div className="flex items-end justify-between gap-2 h-24 pt-4">
                      {[40, 55, 48, 70, 65, 88, 92, 100].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                          <div
                            style={{ height: `${h}%` }}
                            className={`w-full rounded-t-[4px] transition-all ${
                              i === 7 ? "bg-[#0071E3]" : "bg-[#D1D1D6] dark:bg-[#3A3A3C]"
                            }`}
                          />
                          <span className="text-[9px] font-mono text-[#86868B]">M{i + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mini Data Table */}
                  <div className="p-4 rounded-[16px] bg-[#FBFBFD] dark:bg-[#121214] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                    <div className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2 flex items-center justify-between">
                      <span>Region Distribution</span>
                      <Table2 className="h-3.5 w-3.5 text-[#86868B]" />
                    </div>
                    <div className="space-y-1.5 text-[11px] font-mono">
                      <div className="flex justify-between py-1 border-b border-[#E5E5EA]/40 dark:border-[#2C2C2E]/40">
                        <span className="text-[#86868B]">North America</span>
                        <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">$1,240,000 (50%)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#E5E5EA]/40 dark:border-[#2C2C2E]/40">
                        <span className="text-[#86868B]">Europe / UK</span>
                        <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">$860,000 (35%)</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-[#86868B]">Asia-Pacific</span>
                        <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">$382,900 (15%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Signature */}
                <div className="pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between text-xs text-[#86868B]">
                  <div>Verified by DataFusion Automated Audit Engine v2.4</div>
                  <div className="font-mono text-[11px] text-[#34C759]">SHA256: 8f4e...9a21 (Secured)</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
