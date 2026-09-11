"use client";

import { useState } from "react";
import { 
  Cpu, 
  Database, 
  HardDrive, 
  BarChart3, 
  Globe, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  ChevronRight
} from "lucide-react";

interface LayerDetail {
  id: string;
  step: string;
  title: string;
  tech: string;
  badge: string;
  description: string;
  icon: any;
  specs: { label: string; value: string }[];
  throughput: string;
}

const ARCHITECTURE_LAYERS: LayerDetail[] = [
  {
    id: "frontend",
    step: "01",
    title: "Client & Presentation",
    tech: "Next.js 15 App Router · React 19",
    badge: "Edge Cached",
    description: "Apple-inspired responsive workspace with zero-layout-shift glassmorphic controls and client-side vectorized charting.",
    icon: Globe,
    specs: [
      { label: "Rendering", value: "RSC + Streaming SSR" },
      { label: "Interactive Engine", value: "ECharts 5 & Canvas" },
      { label: "State Synchronization", value: "Zustand & TanStack" }
    ],
    throughput: "60 FPS Render"
  },
  {
    id: "api",
    step: "02",
    title: "Unified Gateway & Auth",
    tech: "Edge Route Handlers · Jose JWT",
    badge: "Sub-5ms",
    description: "Validates tenant isolation, verifies cryptographic session tokens, and executes row-level policy enforcement prior to query parsing.",
    icon: ShieldCheck,
    specs: [
      { label: "Token Verification", value: "Ed25519 / HMAC" },
      { label: "Tenant Injection", value: "Contextual Header" },
      { label: "Rate Limiting", value: "Sliding Window" }
    ],
    throughput: "12,000 req/s"
  },
  {
    id: "metadata",
    step: "03",
    title: "Metadata & Catalog",
    tech: "PostgreSQL 16 · Prisma ORM",
    badge: "ACID Compliant",
    description: "Authoritative relational source for tenant boundaries, user privileges, dataset schemas, saved chart configurations, and audit logs.",
    icon: Database,
    specs: [
      { label: "Isolation", value: "Row-Level Security (RLS)" },
      { label: "Connection Pool", value: "PgBouncer Stateful" },
      { label: "Schema Registry", value: "JSONB Definitions" }
    ],
    throughput: "< 2ms Latency"
  },
  {
    id: "engine",
    step: "04",
    title: "Analytical Compute",
    tech: "DuckDB Embedded · Vectorized SIMD",
    badge: "Ultra Fast",
    description: "In-memory columnar query execution engine capable of scanning millions of records per second directly in Parquet/Arrow memory buffers.",
    icon: Cpu,
    specs: [
      { label: "Execution Mode", value: "Vectorized SIMD" },
      { label: "Memory Pipeline", value: "Zero-Copy Arrow" },
      { label: "Aggregation", value: "Parallel Group-By" }
    ],
    throughput: "45M rows/sec"
  },
  {
    id: "storage",
    step: "05",
    title: "Columnar Storage",
    tech: "Apache Parquet · Object Store",
    badge: "Compressed",
    description: "Snappy-compressed columnar partitions with bloom filters and min/max statistics for rapid partition pruning without full table scans.",
    icon: HardDrive,
    specs: [
      { label: "Compression Ratio", value: "82% vs Raw CSV" },
      { label: "File Format", value: "Parquet v2 Columnar" },
      { label: "Transfer Protocol", value: "HTTPS Range-Byte" }
    ],
    throughput: "1.4 GB/s Read"
  },
  {
    id: "analytics",
    step: "06",
    title: "Analytics & Telemetry",
    tech: "Reactive Cache · Live Telemetry",
    badge: "Realtime",
    description: "Dispatches pre-aggregated metric rollups to client dashboards with push updates for collaborative multi-user exploration.",
    icon: BarChart3,
    specs: [
      { label: "Cache Layer", value: "LRU Query Invalidation" },
      { label: "Streaming", value: "Server-Sent Events" },
      { label: "AI Insights", value: "Statistical Outlier Detector" }
    ],
    throughput: "Instant Metric Sync"
  }
];

export function SystemArchitectureDiagram() {
  const [selectedLayer, setSelectedLayer] = useState<LayerDetail>(ARCHITECTURE_LAYERS[3]!);

  return (
    <div className="w-full rounded-[24px] bg-white dark:bg-[#101012] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden">
      {/* Header Bar */}
      <div className="px-6 sm:px-8 py-5 border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FBFBFD] dark:bg-[#151518]">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0071E3]/10 text-[#0071E3] dark:text-[#0A84FF]">
              <Zap className="h-3 w-3" />
              Engine Architecture
            </span>
            <span className="text-xs text-[#86868B]">End-to-End Pipeline</span>
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] mt-1">
            DataFusion High-Performance Stack
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[#86868B]">
            <span className="h-2 w-2 rounded-full bg-[#34C759] animate-pulse" />
            <span className="font-mono">Sub-10ms Pipeline Active</span>
          </div>
        </div>
      </div>

      {/* Horizontal Interactive Pipeline */}
      <div className="p-6 sm:p-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {ARCHITECTURE_LAYERS.map((layer) => {
            const isSelected = selectedLayer.id === layer.id;
            const Icon = layer.icon;

            return (
              <button
                key={layer.id}
                onClick={() => setSelectedLayer(layer)}
                className={`group relative text-left p-4 rounded-[18px] border transition-all duration-300 flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#0071E3]/5 dark:bg-[#0A84FF]/10 border-[#0071E3] dark:border-[#0A84FF] shadow-[0_8px_20px_rgba(0,113,227,0.12)]"
                    : "bg-[#FBFBFD] dark:bg-[#18181B] border-[#E5E5EA] dark:border-[#2C2C2E] hover:border-[#D1D1D6] dark:hover:border-[#3A3A3C] hover:bg-white dark:hover:bg-[#1C1C1E]"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <span className={`text-[11px] font-mono font-bold ${
                    isSelected ? "text-[#0071E3] dark:text-[#0A84FF]" : "text-[#86868B]"
                  }`}>
                    {layer.step}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#636366] dark:text-[#AEAEB2]">
                    {layer.badge}
                  </span>
                </div>

                <div className={`h-9 w-9 rounded-[12px] flex items-center justify-center mb-3 transition-colors ${
                  isSelected
                    ? "bg-[#0071E3] text-white"
                    : "bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] group-hover:text-[#0071E3] dark:group-hover:text-[#0A84FF]"
                }`}>
                  <Icon className="h-4 w-4" />
                </div>

                <div>
                  <div className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] line-clamp-1">
                    {layer.title}
                  </div>
                  <div className="text-[11px] text-[#86868B] line-clamp-1 mt-0.5 font-mono">
                    {layer.throughput}
                  </div>
                </div>

                {/* Arrow connector indicator */}
                <div className="mt-3 pt-2 border-t border-[#E5E5EA]/60 dark:border-[#2C2C2E]/60 flex items-center justify-between text-[11px]">
                  <span className={`text-[10px] font-medium ${isSelected ? "text-[#0071E3] dark:text-[#0A84FF]" : "text-[#86868B]"}`}>
                    Inspect
                  </span>
                  <ChevronRight className={`h-3 w-3 transition-transform ${isSelected ? "text-[#0071E3] dark:text-[#0A84FF] translate-x-0.5" : "text-[#AEAEB2]"}`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Layer Inspector Panel */}
        <div className="mt-6 p-6 rounded-[20px] bg-[#FBFBFD] dark:bg-[#151518] border border-[#E5E5EA] dark:border-[#2C2C2E] transition-all">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#0071E3]/10 text-[#0071E3] dark:text-[#0A84FF]">
                  Layer {selectedLayer.step} Detail
                </span>
                <span className="text-xs font-mono text-[#86868B]">{selectedLayer.tech}</span>
              </div>
              <h4 className="text-base sm:text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                {selectedLayer.title}
              </h4>
              <p className="text-xs sm:text-sm text-[#86868B] leading-relaxed">
                {selectedLayer.description}
              </p>
            </div>

            {/* Micro Specs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
              {selectedLayer.specs.map((spec, idx) => (
                <div 
                  key={idx} 
                  className="p-3.5 rounded-[14px] bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] min-w-[160px]"
                >
                  <div className="text-[11px] text-[#86868B] font-medium">{spec.label}</div>
                  <div className="text-xs sm:text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
                    {spec.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Flow Summary Ribbon */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[#86868B] px-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#34C759]" />
            <span>Fully vectorized column projection</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#34C759]" />
            <span>Zero network hop between DuckDB & Parquet</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#34C759]" />
            <span>Postgres Row-Level Security guaranteed at Edge</span>
          </div>
        </div>
      </div>
    </div>
  );
}
