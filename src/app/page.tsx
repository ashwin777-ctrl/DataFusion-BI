"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { InlineSignIn } from "@/components/auth/inline-sign-in";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Terminal,
} from "lucide-react";

import { AppleHeroWorkspace } from "@/components/visuals/apple-hero-workspace";
import { DataIngestionFlow } from "@/components/visuals/data-ingestion-flow";
import { DataModelVisualizer } from "@/components/visuals/data-model-visualizer";
import { SystemArchitectureDiagram } from "@/components/visuals/system-architecture-diagram";
import { SecurityMultiTenancyDiagram } from "@/components/visuals/security-multitenancy-diagram";
import { InsightsStorytelling } from "@/components/visuals/insights-storytelling";
import { ReportDeckVisualizer } from "@/components/visuals/report-deck-visualizer";
import { FeatureAnalyticalCard } from "@/components/visuals/feature-analytical-card";

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
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#000000] text-[#1D1D1F] dark:text-[#F5F5F7] selection:bg-[#0071E3] selection:text-white transition-colors duration-300">
      {/* 1. Header Navigation - Apple Glass Command Bar */}
      <header className="sticky top-0 z-50 border-b border-[#E5E5EA] dark:border-[#2C2C2E] bg-white/80 dark:bg-black/80 backdrop-blur-2xl transition-colors">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#0071E3] text-white font-bold text-sm shadow-[0_2px_8px_rgba(0,113,227,0.35)]">
                DF
              </span>
              <span className="font-semibold tracking-tight text-base sm:text-lg text-[#1D1D1F] dark:text-[#F5F5F7]">
                DataFusion<span className="text-[#0071E3] dark:text-[#0A84FF]">BI</span>
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#86868B]">
            <a href="#overview" className="transition-colors hover:text-[#1D1D1F] dark:hover:text-white">Workspace</a>
            <a href="#sources" className="transition-colors hover:text-[#1D1D1F] dark:hover:text-white">Ingestion</a>
            <a href="#topology" className="transition-colors hover:text-[#1D1D1F] dark:hover:text-white">Data Model</a>
            <a href="#analytics" className="transition-colors hover:text-[#1D1D1F] dark:hover:text-white">Insights</a>
            <a href="#reports" className="transition-colors hover:text-[#1D1D1F] dark:hover:text-white">Reports</a>
            <a href="#security" className="transition-colors hover:text-[#1D1D1F] dark:hover:text-white">Security</a>
            <a href="#architecture" className="transition-colors hover:text-[#1D1D1F] dark:hover:text-white">Architecture</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeSwitcher />
            <a href="#signin" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm" className="text-xs font-medium rounded-full text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white">
                Sign In
              </Button>
            </a>
            <Link href="/login">
              <Button size="sm" className="gap-1.5 text-xs font-semibold bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full shadow-[0_2px_8px_rgba(0,113,227,0.3)] px-3.5 sm:px-4">
                <span className="hidden sm:inline">Open Portal</span>
                <span className="sm:hidden">Login</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="space-y-24 sm:space-y-32 py-12 sm:py-16">
        {/* 2. LANDING / HERO: Floating Analytics Workspace */}
        <section id="overview" className="relative overflow-hidden px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
              
              {/* Left Column: Project Mission & Architectural Guarantees */}
              <div className="lg:col-span-5 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white/60 dark:bg-[#161618]/60 px-3.5 py-1.5 backdrop-blur shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-[#34C759] animate-pulse" />
                  <span className="text-xs font-medium uppercase tracking-wider text-[#86868B] font-mono">
                    Next-Gen Analytics Engine
                  </span>
                </div>

                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-[1.08] text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Precision Analytics. <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0071E3] via-[#5856D6] to-[#AF52DE]">
                    Vectorized & Instant.
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-[#86868B] leading-relaxed">
                  DataFusion BI is a high-performance business intelligence suite uniting in-process 
                  <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]"> DuckDB OLAP</strong>, real-time <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">PostgreSQL 16</strong> multi-tenant isolation, interactive <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">relational data models</strong>, and autonomous statistical diagnostics.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a href="#signin">
                    <Button size="md" className="h-11 px-6 gap-2 font-medium bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full shadow-[0_4px_14px_rgba(0,113,227,0.35)]">
                      <span>Launch Workspace</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </a>

                  <Link href="/login">
                    <Button variant="secondary" size="md" className="h-11 px-5 gap-2 font-medium rounded-full border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E]">
                      <Terminal className="h-4 w-4 text-[#86868B]" />
                      <span>Dedicated Login</span>
                    </Button>
                  </Link>
                </div>

                {/* Key Architectural Guarantees Strip */}
                <div className="grid grid-cols-3 gap-3 pt-6 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <div className="p-3.5 rounded-[18px] bg-white dark:bg-[#101012] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-sm">
                    <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]">
                      &lt;2<span className="text-[#86868B] text-xs font-mono">ms</span>
                    </div>
                    <div className="text-[11px] text-[#86868B] font-medium mt-0.5">In-Process DuckDB</div>
                  </div>
                  <div className="p-3.5 rounded-[18px] bg-white dark:bg-[#101012] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-sm">
                    <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]">
                      100<span className="text-[#86868B] text-xs font-mono">%</span>
                    </div>
                    <div className="text-[11px] text-[#86868B] font-medium mt-0.5">Postgres 16 RLS</div>
                  </div>
                  <div className="p-3.5 rounded-[18px] bg-white dark:bg-[#101012] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-sm">
                    <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]">
                      Zero<span className="text-[#86868B] text-xs font-mono">Copy</span>
                    </div>
                    <div className="text-[11px] text-[#86868B] font-medium mt-0.5">Arrow Parquet</div>
                  </div>
                </div>
              </div>

              {/* Right Column: Apple-Inspired Floating Analytics Workspace Visualizer */}
              <div className="lg:col-span-7">
                <AppleHeroWorkspace />
              </div>

            </div>
          </div>
        </section>

        {/* 3. DATA SOURCES: Multi-Source Ingestion Pipeline Flow */}
        <section id="sources" className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-mono uppercase tracking-widest text-[#0071E3] dark:text-[#0A84FF] font-semibold">
                Unified Data Ingestion
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] mt-2">
                Multi-Source Ingestion & Columnar Sanitization
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#86868B]">
                Ingest messy workbooks or live database schemas into partitioned, Snappy-compressed Parquet lakehouses with automated type casting.
              </p>
            </div>

            {/* Purposeful Ingestion Flow Diagram */}
            <DataIngestionFlow />

            {/* Feature Analytical Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <FeatureAnalyticalCard
                type="ingest"
                title="Excel & CSV Normalization"
                badge="Active Connector"
                description="Automatic multi-sheet detection, header parsing, delimiter inference, and null sanitization."
                specs="Snappy Parquet v2 · Arrow Buffer"
              />
              <FeatureAnalyticalCard
                type="rls"
                title="PostgreSQL 16 Direct Sync"
                badge="Port 5434 Verified"
                description="Cryptographically secured connection with SSL encryption, schema introspection, and continuous change tracking."
                specs="Strict Multi-Tenant RLS Policy"
              />
              <FeatureAnalyticalCard
                type="simd"
                title="DuckDB In-Process Vectorization"
                badge="Vectorized SIMD"
                description="Columnar SQL engine executing directly inside application process memory with zero-copy Arrow transfers."
                specs="45M rows/sec · Parallel Group-By"
              />
            </div>
          </div>
        </section>

        {/* 4. DATA PREP / MODEL: Polished Schema Topology Visualizer */}
        <section id="topology" className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-mono uppercase tracking-widest text-[#5856D6] dark:text-[#AF52DE] font-semibold">
                Relational Modeling
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] mt-2">
                Interactive Data Model & Join Synthesizer
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#86868B]">
                Discover foreign keys, primary keys, and common identifiers between your spreadsheets and transactional tables into an optimized star schema.
              </p>
            </div>

            {/* Purposeful Data Model Visualizer */}
            <DataModelVisualizer />
          </div>
        </section>

        {/* 5. INSIGHTS / ANALYTICS: Intelligent Visual Storytelling */}
        <section id="analytics" className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-mono uppercase tracking-widest text-[#AF52DE] font-semibold">
                Autonomous Diagnostics
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] mt-2">
                Predictive Forecasting & Anomaly Attribution
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#86868B]">
                Autonomous statistical scanner evaluating variance shifts, categorical distributions, and bayesian trajectory forecasts without manual SQL queries.
              </p>
            </div>

            {/* Purposeful Insights Storytelling Diagram */}
            <InsightsStorytelling />
          </div>
        </section>

        {/* 6. REPORTS / EXPORT: Executive Report Deck Visualizer */}
        <section id="reports" className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-mono uppercase tracking-widest text-[#FF9500] font-semibold">
                Automated Publication
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] mt-2">
                Executive Publication & Multi-Format Decks
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#86868B]">
                Distribute boardroom-ready vector PDF documents, structured Excel spreadsheets, and cryptographically verified audit summaries.
              </p>
            </div>

            {/* Purposeful Report Deck Visualizer */}
            <ReportDeckVisualizer />
          </div>
        </section>

        {/* 7. SECURITY / MULTI-TENANCY: Layered Security Architecture */}
        <section id="security" className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-mono uppercase tracking-widest text-[#34C759] font-semibold">
                Cryptographic Governance
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] mt-2">
                Hardware-Enforced Multi-Tenant Isolation
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#86868B]">
                Organization-level tenant separation, workspace boundaries, and PostgreSQL Row-Level Security guarantee zero data leakage between accounts.
              </p>
            </div>

            {/* Purposeful Security Multi-Tenancy Diagram */}
            <SecurityMultiTenancyDiagram />
          </div>
        </section>

        {/* 8. SYSTEM ARCHITECTURE: End-to-End Technical Pipeline */}
        <section id="architecture" className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-mono uppercase tracking-widest text-[#0071E3] dark:text-[#0A84FF] font-semibold">
                System Specifications
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] mt-2">
                End-to-End Engine Architecture
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#86868B]">
                From client presentation to vectorized SIMD compute and columnar Parquet partitions: inspect every layer of the DataFusion pipeline.
              </p>
            </div>

            {/* Purposeful System Architecture Diagram */}
            <SystemArchitectureDiagram />
          </div>
        </section>

        {/* 9. SIGN IN SECTION INSIDE THE WEBPAGE */}
        <section id="signin" className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl p-8 sm:p-12 rounded-[28px] bg-white dark:bg-[#101012] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Column: Access Information */}
              <div className="lg:col-span-6 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0071E3]/10 text-xs font-mono text-[#0071E3] dark:text-[#0A84FF]">
                  <Lock className="w-3.5 h-3.5" />
                  <span>SECURE GATEWAY ACCESS</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Access Your Organization Workspace
                </h2>
                <p className="text-sm sm:text-base text-[#86868B] leading-relaxed">
                  Authenticate directly from this page to access your live analytics dashboard. 
                  All queries execute inside your cryptographically isolated PostgreSQL 16 tenant partition with automated session management.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
                    <CheckCircle2 className="h-4 w-4 text-[#34C759] shrink-0" />
                    <span>Instant access with pre-configured demo account</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
                    <CheckCircle2 className="h-4 w-4 text-[#34C759] shrink-0" />
                    <span>Real-time DuckDB OLAP cluster telemetry & SQL profiler</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
                    <CheckCircle2 className="h-4 w-4 text-[#34C759] shrink-0" />
                    <span>Seamless session token persistence with HTTP-only cookies</span>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <Link href="/login">
                    <Button variant="outline" className="gap-2 rounded-full text-xs font-medium border-[#E5E5EA] dark:border-[#2C2C2E]">
                      <span>Prefer Dedicated Login Page?</span>
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

        {/* 10. ENTERPRISE INQUIRY FORM */}
        <section id="inquiry" className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl p-8 sm:p-12 rounded-[28px] bg-white dark:bg-[#101012] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-sm">
            <div className="text-center mb-8">
              <span className="text-xs font-mono uppercase tracking-widest text-[#86868B] block mb-2 font-semibold">
                Private Deployment
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                Initiate Enterprise BI Assessment
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#86868B]">
                Connect with our systems architects for private VPC deployment, custom DuckDB extensions, and specialized schema modeling.
              </p>
            </div>

            <form onSubmit={handleInquirySubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={inquiryName}
                    onChange={(e) => setInquiryName(e.target.value)}
                    placeholder="e.g. Maya Lin"
                    className="w-full rounded-[12px] border border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#FBFBFD] dark:bg-[#18181A] px-3.5 py-2.5 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] outline-none focus:border-[#0071E3] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                    Work Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={inquiryEmail}
                    onChange={(e) => setInquiryEmail(e.target.value)}
                    placeholder="maya@enterprise.com"
                    className="w-full rounded-[12px] border border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#FBFBFD] dark:bg-[#18181A] px-3.5 py-2.5 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] outline-none focus:border-[#0071E3] transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                  Architecture Scope & Data Footprint <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={inquiryMessage}
                  onChange={(e) => setInquiryMessage(e.target.value)}
                  placeholder="Describe your current data warehouse volume, spreadsheet complexity, and analytics targets..."
                  className="w-full rounded-[12px] border border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#FBFBFD] dark:bg-[#18181A] px-3.5 py-2.5 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] outline-none focus:border-[#0071E3] transition-all"
                  required
                />
              </div>

              {inquiryError && (
                <div className="rounded-[12px] bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
                  {inquiryError}
                </div>
              )}

              {inquiryStatus === "success" && (
                <div className="rounded-[12px] bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-semibold text-[#34C759]">
                  Inquiry received. Our systems engineering lead will reach out within 24 hours.
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-[#86868B] font-medium">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Encrypted transmission · Zero data sharing</span>
                </div>

                <Button type="submit" disabled={inquiryStatus === "submitting"} className="px-6 font-semibold bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full shadow-sm">
                  {inquiryStatus === "submitting" ? "Transmitting..." : "Submit Inquiry"}
                </Button>
              </div>
            </form>
          </div>
        </section>
      </main>

      {/* 11. GLOBAL FOOTER - Apple Style Clean Editorial */}
      <footer className="border-t border-[#E5E5EA] dark:border-[#2C2C2E] bg-white/60 dark:bg-[#0A0A0C] py-12 px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-[#0071E3] text-white font-bold text-xs">
              DF
            </span>
            <span className="font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">DataFusion BI</span>
            <span className="text-[#86868B] text-xs">· Embedded In-Process Intelligence</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#86868B]">
            <a href="#signin" className="hover:text-[#1D1D1F] dark:hover:text-white transition-colors">Sign In</a>
            <Link href="/login" className="hover:text-[#1D1D1F] dark:hover:text-white transition-colors">Login Page</Link>
            <Link href="/signup" className="hover:text-[#1D1D1F] dark:hover:text-white transition-colors">Register</Link>
            <a href="#overview" className="hover:text-[#1D1D1F] dark:hover:text-white transition-colors">Back to Top</a>
          </div>

          <div className="text-[11px] text-[#86868B] font-mono">
            © 2026 DataFusion BI. PostgreSQL 16 & DuckDB Vectorized.
          </div>
        </div>
      </footer>
    </div>
  );
}
