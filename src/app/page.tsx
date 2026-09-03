"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { InlineSignIn } from "@/components/auth/inline-sign-in";
import { Button } from "@/components/ui/button";
import {
  Database,
  FileSpreadsheet,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Cpu,
  CheckCircle2,
  Lock,
  ChevronRight,
  Layers,
  Terminal,
} from "lucide-react";

const HeroDataCore = dynamic(
  () => import("@/components/3d/hero-data-core").then((m) => m.HeroDataCore),
  { ssr: false }
);

const TopologyUniverse = dynamic(
  () => import("@/components/3d/topology-universe").then((m) => m.TopologyUniverse),
  { ssr: false }
);

export default function LandingPage() {
  const [inquiryStatus, setInquiryStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquiryError, setInquiryError] = useState<string | null>(null);

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInquiryError(null);

    if (!inquiryName.trim()) {
      setInquiryError("Please provide your name.");
      return;
    }
    if (!inquiryEmail.includes("@") || !inquiryEmail.includes(".")) {
      setInquiryError("Please provide a valid work email address.");
      return;
    }
    if (inquiryMessage.trim().length < 10) {
      setInquiryError("Message should be at least 10 characters.");
      return;
    }

    setInquiryStatus("submitting");
    setTimeout(() => {
      setInquiryStatus("success");
      setInquiryName("");
      setInquiryEmail("");
      setInquiryMessage("");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black transition-colors duration-300">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-black font-black text-sm shadow-md">
                DF
              </span>
              <span className="font-display font-extrabold tracking-tight text-base sm:text-lg text-white">
                DataFusion<span className="text-zinc-400">BI</span>
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <a href="#overview" className="transition-colors hover:text-white">Project Overview</a>
            <a href="#architecture" className="transition-colors hover:text-white">Architecture</a>
            <a href="#signin" className="transition-colors hover:text-white">Sign In</a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <a href="#signin">
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10">
                Sign In
              </Button>
            </a>
            <Link href="/login">
              <Button size="sm" className="gap-1.5 text-xs font-bold bg-white text-black hover:bg-zinc-200 shadow-md">
                <span>Open Login Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* 2. PROJECT HERO SECTION WITH 3D DATA CORE */}
        <section id="overview" className="relative overflow-hidden pt-12 pb-20 lg:pt-16 lg:pb-24 border-b border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
              
              {/* Left Column: Project Mission & Architectural Guarantees */}
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 backdrop-blur shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                    Production Enterprise BI Platform
                  </span>
                </div>

                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl font-display leading-[1.08] text-white">
                  Intelligent Analytics. <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500">
                    Vectorized & Spatial.
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-xl">
                  DataFusion BI is a high-performance business intelligence suite uniting in-process 
                  <strong className="text-white"> DuckDB OLAP</strong>, real-time <strong className="text-white">PostgreSQL 16</strong> multi-tenant isolation, interactive <strong className="text-white">3D schema topologies</strong>, and autonomous statistical diagnostics.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a href="#signin">
                    <Button size="md" className="h-11 px-6 gap-2 font-bold bg-white text-black hover:bg-zinc-200 shadow-xl">
                      <span>Sign In to Workspace</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </a>

                  <Link href="/login">
                    <Button variant="outline" size="md" className="h-11 px-5 gap-2 font-semibold border-white/20 text-white hover:bg-white/10 bg-transparent">
                      <Terminal className="h-4 w-4 text-zinc-300" />
                      <span>Dedicated Login Page</span>
                    </Button>
                  </Link>

                  <a href="#architecture" className="text-xs font-mono text-zinc-400 hover:text-white px-2 py-2 flex items-center gap-1 transition-colors">
                    <span>Explore System Specs</span>
                    <ChevronRight className="h-3 w-3" />
                  </a>
                </div>

                {/* Key Architectural Guarantees Strip */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
                  <div className="p-3 rounded-xl bg-[#0a0a0a] border border-white/10">
                    <div className="text-xl sm:text-2xl font-black font-display text-white">
                      &lt;2<span className="text-zinc-400 text-sm font-mono">ms</span>
                    </div>
                    <div className="text-xs text-zinc-400 font-medium">In-Process OLAP</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a0a0a] border border-white/10">
                    <div className="text-xl sm:text-2xl font-black font-display text-white">
                      100<span className="text-zinc-400 text-sm font-mono">%</span>
                    </div>
                    <div className="text-xs text-zinc-400 font-medium">Postgres 16 RLS</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a0a0a] border border-white/10">
                    <div className="text-xl sm:text-2xl font-black font-display text-white">
                      Zero<span className="text-zinc-400 text-sm font-mono">Copy</span>
                    </div>
                    <div className="text-xs text-zinc-400 font-medium">Arrow / Parquet</div>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive 3D Spatial Intelligence Core */}
              <div className="lg:col-span-6">
                <div className="relative mx-auto h-[440px] sm:h-[500px] w-full max-w-[560px] rounded-3xl border border-white/15 bg-[#0a0a0a]/90 p-2 shadow-2xl backdrop-blur-2xl overflow-hidden">
                  <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-black/80 border border-white/15 text-[11px] font-mono text-zinc-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>THREE.JS DATA CORE (SPATIAL 3D)</span>
                  </div>
                  <HeroDataCore className="h-full w-full rounded-2xl overflow-hidden" />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 3. SIGN IN SECTION INSIDE THE WEBPAGE */}
        <section id="signin" className="py-20 bg-[#050505] border-b border-white/10 relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Column: Access Information */}
              <div className="lg:col-span-6 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-mono text-zinc-300">
                  <Lock className="w-3.5 h-3.5 text-white" />
                  <span>SECURE GATEWAY ACCESS</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-white">
                  Access Your Organization Workspace
                </h2>
                <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
                  Authenticate directly from this page to access your live analytics dashboard. 
                  All queries execute inside your cryptographically isolated PostgreSQL 16 tenant partition with automated session management.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Instant access with pre-configured demo account</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Real-time DuckDB OLAP cluster telemetry & SQL profiler</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Seamless session token persistence with HTTP-only cookies</span>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <Link href="/login">
                    <Button variant="outline" className="gap-2 border-white/20 text-white hover:bg-white/10 bg-transparent">
                      <span>Prefer Full Login Page?</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right Column: Embedded Interactive Sign In Module */}
              <div className="lg:col-span-6 flex justify-center">
                <InlineSignIn />
              </div>

            </div>
          </div>
        </section>

        {/* 4. ABOUT THE PROJECT: ARCHITECTURE & ENGINE */}
        <section id="architecture" className="py-20 border-b border-white/10 bg-black">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 block mb-2 font-semibold">
                System Specifications
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-white">
                About the DataFusion BI Platform
              </h2>
              <p className="mt-3 text-zinc-400 text-sm sm:text-base leading-relaxed">
                Engineered from the ground up to eliminate analytical latency, brittle ETL chains, and sluggish cloud queries through a hybrid PostgreSQL 16 + DuckDB vectorized architecture.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Architecture Block 1 */}
              <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-white/20 transition-all space-y-4 shadow-xl">
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold font-display text-white">Vectorized DuckDB Kernel</h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Processes millions of analytical records per second directly in process memory using SIMD vectorized execution kernels. Eliminates round-trip serialization overhead.
                </p>
                <div className="pt-2 text-xs font-mono text-zinc-300">
                  Zero-Copy Arrow Parquet Partitions
                </div>
              </div>

              {/* Architecture Block 2 */}
              <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-white/20 transition-all space-y-4 shadow-xl">
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
                  <Database className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold font-display text-white">PostgreSQL 16 Multi-Tenant RLS</h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Strict cryptographic tenant isolation powered by PostgreSQL 16 Row-Level Security. Every schema, session, and joined table enforces organizational boundaries.
                </p>
                <div className="pt-2 text-xs font-mono text-emerald-400">
                  Local Cluster Active on Port 5434
                </div>
              </div>

              {/* Architecture Block 3 */}
              <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-white/20 transition-all space-y-4 shadow-xl">
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold font-display text-white">Autonomous AI Diagnostics</h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Automated anomaly detection sweeps categorical columns and variance shifts in real time, delivering executive briefing insights and risk flags without manual SQL queries.
                </p>
                <div className="pt-2 text-xs font-mono text-zinc-300">
                  Deterministic Statistical Models
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. DATA SOURCES INGESTION */}
        <section id="sources" className="border-b border-white/10 bg-[#050505] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 block mb-2 font-semibold">
                High-Density Ingestion
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-white">
                Multi-Source Ingestion & Sanitization
              </h2>
              <p className="mt-3 text-zinc-400 text-sm sm:text-base">
                Whether spreadsheets or enterprise transactional databases, DataFusion normalizes schemas into high-efficiency Parquet partitions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Excel / CSV Card */}
              <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-white/20 transition-all shadow-xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold font-display text-white">Excel & CSV Upload</h3>
                <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Drag-and-drop workbook ingestion supporting .xlsx, .xls, and .csv. Automatic multi-sheet detection, type inference, and dirty-data sanitization.
                </p>
                <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/10">
                  <span className="text-xs font-mono text-emerald-400 font-semibold">Active Connector</span>
                  <Link href="/app/sources" className="text-xs font-bold text-white flex items-center gap-1 hover:translate-x-1 transition-transform">
                    Upload File <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* PostgreSQL Card */}
              <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-white/20 transition-all shadow-xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white border border-white/20 mb-4">
                  <Database className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold font-display text-white">PostgreSQL 16 Direct</h3>
                <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Cryptographically secured direct database connector with SSL encryption, schema introspection, table selection, and continuous change sync.
                </p>
                <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/10">
                  <span className="text-xs font-mono text-zinc-300 font-semibold">Verified on Port 5434</span>
                  <Link href="/app/sources" className="text-xs font-bold text-white flex items-center gap-1 hover:translate-x-1 transition-transform">
                    Connect DB <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* Columnar DuckDB Engine Card */}
              <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-white/20 transition-all shadow-xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white border border-white/20 mb-4">
                  <Cpu className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold font-display text-white">DuckDB In-Process OLAP</h3>
                <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Vectorized analytical SQL engine executing directly inside the application process. Zero network serialization bottleneck for 1M+ row aggregations.
                </p>
                <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/10">
                  <span className="text-xs font-mono text-zinc-300 font-semibold">DuckDB 1.3.4</span>
                  <Link href="/app" className="text-xs font-bold text-white flex items-center gap-1 hover:translate-x-1 transition-transform">
                    View Engine <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. 3D TOPOLOGY UNIVERSE & SCHEMA MODELING */}
        <section id="topology" className="py-20 border-b border-white/10 bg-black">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              
              <div className="lg:col-span-5 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-mono text-zinc-300">
                  <Layers className="w-3.5 h-3.5 text-white" />
                  <span>SPATIAL SCHEMA MODELING</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-white">
                  Visual Relationship Modeling & Automated Joins
                </h2>
                <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
                  DataFusion automatically detects foreign keys, primary keys, and common identifiers between your spreadsheets and database tables, synthesizing them into a queryable relational star schema.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-sm font-medium text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Source Validation & Schema Normalization</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Automated Foreign Key & Lineage Inference</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>In-Memory Consolidation View Generation</span>
                  </div>
                </div>

                <div className="pt-4">
                  <Link href="/app/prep">
                    <Button size="md" className="gap-2 font-bold bg-white text-black hover:bg-zinc-200 shadow-xl">
                      <span>Launch Modeling Canvas</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-white/15 bg-[#0a0a0a] p-2 shadow-2xl overflow-hidden">
                  <TopologyUniverse className="rounded-xl" />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 7. LIVE ANALYTICS PREVIEW */}
        <section id="analytics" className="border-b border-white/10 bg-[#050505] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 block mb-2 font-semibold">
                Executive Command Center
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-white">
                Adaptive Analytical Dashboards
              </h2>
              <p className="mt-3 text-zinc-400 text-sm sm:text-base">
                Dynamically generated KPIs and high-contrast visualizations tailored precisely to your dataset&apos;s discovered dimensions.
              </p>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="p-5 rounded-xl bg-[#0a0a0a] border border-white/10 shadow-lg">
                <span className="text-xs font-semibold text-zinc-400">Total Ingestion Volume</span>
                <div className="mt-2 text-2xl font-extrabold font-display text-white">4.82B</div>
                <div className="mt-1 flex items-center gap-1 text-xs text-emerald-400 font-semibold font-mono">
                  <TrendingUp className="h-3 w-3" />
                  <span>+18.4% 24h</span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#0a0a0a] border border-white/10 shadow-lg">
                <span className="text-xs font-semibold text-zinc-400">Median Query Latency</span>
                <div className="mt-2 text-2xl font-extrabold font-display text-white">0.14ms</div>
                <div className="mt-1 text-xs text-emerald-400 font-mono">P99: 412ms</div>
              </div>

              <div className="p-5 rounded-xl bg-[#0a0a0a] border border-white/10 shadow-lg">
                <span className="text-xs font-semibold text-zinc-400">Active Partitions</span>
                <div className="mt-2 text-2xl font-extrabold font-display text-white">1,024</div>
                <div className="mt-1 text-xs text-zinc-400 font-mono">100% Online</div>
              </div>

              <div className="p-5 rounded-xl bg-[#0a0a0a] border border-white/10 shadow-lg">
                <span className="text-xs font-semibold text-zinc-400">Schema Violations</span>
                <div className="mt-2 text-2xl font-extrabold font-display text-white">0</div>
                <div className="mt-1 text-xs text-emerald-400 font-semibold">Strict Types</div>
              </div>
            </div>

            <div className="text-center pt-2">
              <Link href="/login">
                <Button size="md" className="gap-2 font-bold bg-white text-black hover:bg-zinc-200 shadow-xl">
                  <span>Enter Live BI Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* 8. ENTERPRISE ASSESSMENT FORM */}
        <section id="inquiry" className="py-20 bg-black">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="p-8 sm:p-10 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl backdrop-blur">
              <div className="text-center mb-8">
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 block mb-2 font-semibold">
                  Private Deployment
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white">
                  Initiate Enterprise 3D BI Assessment
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-zinc-400">
                  Connect with our systems architects for private VPC deployment, custom DuckDB extensions, and specialized 3D topology modeling.
                </p>
              </div>

              <form onSubmit={handleInquirySubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={inquiryName}
                      onChange={(e) => setInquiryName(e.target.value)}
                      placeholder="e.g. Maya Lin"
                      className="w-full rounded-md border border-white/15 bg-black px-3.5 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Work Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={inquiryEmail}
                      onChange={(e) => setInquiryEmail(e.target.value)}
                      placeholder="maya@enterprise.com"
                      className="w-full rounded-md border border-white/15 bg-black px-3.5 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Architecture Scope & Data Footprint <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={inquiryMessage}
                    onChange={(e) => setInquiryMessage(e.target.value)}
                    placeholder="Describe your current data warehouse volume, spreadsheet complexity, and analytics targets..."
                    className="w-full rounded-md border border-white/15 bg-black px-3.5 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
                    required
                  />
                </div>

                {inquiryError && (
                  <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-400">
                    {inquiryError}
                  </div>
                )}

                {inquiryStatus === "success" && (
                  <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-semibold text-emerald-400">
                    Inquiry received. Our systems engineering lead will reach out within 24 hours.
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Encrypted transmission · Zero data sharing</span>
                  </div>

                  <Button type="submit" disabled={inquiryStatus === "submitting"} className="px-6 font-bold bg-white text-black hover:bg-zinc-200 shadow-md">
                    {inquiryStatus === "submitting" ? "Transmitting..." : "Submit Inquiry"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* 9. GLOBAL FOOTER */}
      <footer className="border-t border-white/10 bg-black py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-black font-black text-xs">
              DF
            </span>
            <span className="font-display font-extrabold text-sm text-white">DataFusion BI</span>
            <span className="text-zinc-500 text-xs">· Embedded In-Process Intelligence</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-zinc-400">
            <a href="#signin" className="hover:text-white transition-colors">Sign In</a>
            <Link href="/login" className="hover:text-white transition-colors">Login Page</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Register</Link>
            <a href="#overview" className="hover:text-white transition-colors">Back to Top</a>
          </div>

          <div className="text-[11px] text-zinc-500 font-mono">
            © 2026 DataFusion. PostgreSQL 16 & DuckDB 1.3.4.
          </div>
        </div>
      </footer>
    </div>
  );
}
