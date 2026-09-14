"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Check, 
  Command, 
  Zap, 
  ShieldCheck, 
  BarChart3, 
  Activity, 
  Cpu, 
  HardDrive, 
  Network,
  Menu,
  X,
} from "lucide-react";

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const logos = ["Vercel", "Stripe", "Linear", "Notion", "Figma", "Slack", "Discord", "GitHub"];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-sans">
      {/* Floating Navbar */}
      <header className="sticky top-4 z-50 mx-auto max-w-5xl px-4">
        <nav className="flex items-center justify-between rounded-full border border-neutral-800 bg-neutral-950/80 px-6 py-3 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-white group">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-black group-hover:scale-105 transition-transform">
                DF
              </span>
              <span className="text-base tracking-tight">DataFusion</span>
            </Link>
            <div className="hidden items-center gap-6 text-sm text-neutral-400 md:flex">
              <a href="#features" className="transition hover:text-white">Features</a>
              <a href="#pricing" className="transition hover:text-white">Pricing</a>
              <Link href="/login" className="transition hover:text-white">Docs</Link>
              <Link href="/login" className="transition hover:text-white">Changelog</Link>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/login" className="hidden text-neutral-400 transition hover:text-white sm:inline-block">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="hidden sm:inline-block rounded-full bg-white px-4 py-2 font-medium text-black transition hover:bg-neutral-200"
            >
              Get Started
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1 text-neutral-400 hover:text-white focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mt-2 rounded-2xl border border-neutral-800 bg-neutral-950/95 p-4 backdrop-blur-xl md:hidden shadow-2xl flex flex-col gap-2.5 text-sm animate-in fade-in slide-in-from-top-2">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-neutral-300 hover:bg-neutral-900 transition"
            >
              Features
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-neutral-300 hover:bg-neutral-900 transition"
            >
              Pricing
            </a>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-neutral-300 hover:bg-neutral-900 transition"
            >
              Documentation
            </Link>
            <div className="pt-2 border-t border-neutral-800 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 rounded-xl text-neutral-300 hover:bg-neutral-900 transition"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-neutral-200 transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="hero" className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-3.5 py-1 text-xs text-neutral-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Now in Public Beta
        </div>

        <h1 className="mt-8 text-5xl font-extrabold tracking-tight sm:text-7xl">
          Ship faster.<br />
          <span className="text-neutral-400">Scale smarter.</span>
        </h1>

        <p className="mt-6 max-w-xl text-base text-neutral-400 sm:text-lg leading-relaxed">
          The modern platform for teams who ship fast. Built for scale, designed for speed. 
          Everything you need to build, deploy, and grow with in-process vectorized analytics.
        </p>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-black transition hover:bg-neutral-200 shadow-lg shadow-white/10"
          >
            Start Building <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-neutral-800 bg-neutral-900/80 px-6 py-3 font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
          >
            View Demo
          </Link>
        </div>

        {/* Social Proof */}
        <div className="mt-14 flex flex-col items-center gap-3">
          <div className="flex -space-x-2">
            {["#6366f1", "#0071e3", "#10b981", "#8b5cf6", "#f43f5e"].map((color, i) => (
              <div
                key={i}
                style={{ backgroundColor: color }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-black text-[10px] font-bold text-white uppercase shadow-sm"
              >
                {["AC", "JD", "MK", "SL", "TC"][i]}
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-500">
            Trusted by <span className="font-semibold text-neutral-300">2,000+</span> teams worldwide
          </p>
        </div>

        {/* Marquee / Logos */}
        <div className="mt-16 w-full border-t border-b border-neutral-900 py-6">
          <p className="mb-6 text-xs uppercase tracking-widest text-neutral-500">
            Trusted by Industry Leaders
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-semibold tracking-wide text-neutral-500">
            {logos.map((logo) => (
              <span key={logo} className="hover:text-neutral-300 transition">
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="mx-auto max-w-5xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to ship</h2>
          <p className="mt-3 text-neutral-400">
            Built for modern teams. Powerful features that help you build, deploy, and scale faster than ever.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Main Card */}
          <div className="relative col-span-1 flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-6 md:col-span-2">
            <div>
              <div className="mb-4 inline-flex rounded-lg bg-neutral-900 p-2 text-white">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-semibold">Real-time Monitoring</h3>
              <p className="mt-1 text-sm text-neutral-400">
                Track system health, performance metrics, and alerts in real-time across all your deployments.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-neutral-500"><Cpu className="h-3.5 w-3.5" /> CPU</div>
                <div className="mt-2 text-2xl font-bold">69%</div>
              </div>
              <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-neutral-500"><Activity className="h-3.5 w-3.5" /> Memory</div>
                <div className="mt-2 text-2xl font-bold">77%</div>
              </div>
              <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-neutral-500"><Network className="h-3.5 w-3.5" /> Network</div>
                <div className="mt-2 text-2xl font-bold">89%</div>
              </div>
              <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-neutral-500"><HardDrive className="h-3.5 w-3.5" /> Storage</div>
                <div className="mt-2 text-2xl font-bold">65%</div>
              </div>
            </div>
          </div>

          {/* Command Palette Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div>
              <div className="mb-4 inline-flex rounded-lg bg-neutral-900 p-2 text-white">
                <Command className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-semibold">Command Palette</h3>
              <p className="mt-1 text-sm text-neutral-400">
                Navigate anywhere instantly with powerful keyboard shortcuts.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/50 py-6">
              <span className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 font-mono text-xs font-semibold text-neutral-300">
                ⌘ K
              </span>
            </div>
          </div>

          {/* Analytics */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div className="mb-4 inline-flex rounded-lg bg-neutral-900 p-2 text-white">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-semibold">Analytics</h3>
            <p className="mt-1 text-sm text-neutral-400">
              Deep insights into your application performance and traffic flows.
            </p>
          </div>

          {/* Blazing Fast */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div className="mb-4 inline-flex rounded-lg bg-neutral-900 p-2 text-white">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-semibold">Blazing Fast</h3>
            <p className="mt-1 text-sm text-neutral-400">
              Edge-optimized infrastructure for sub-50ms response times globally.
            </p>
            <div className="mt-4 text-xs font-mono text-emerald-400">~32ms avg response</div>
          </div>

          {/* Enterprise Security */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div className="mb-4 inline-flex rounded-lg bg-neutral-900 p-2 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-semibold">Enterprise Security</h3>
            <p className="mt-1 text-sm text-neutral-400">
              SOC2 compliant with end-to-end encryption and SSO support.
            </p>
            <div className="mt-4 flex gap-2 text-xs font-semibold text-neutral-500">
              <span>SOC2</span> • <span>GDPR</span> • <span>HIPAA</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="mx-auto max-w-5xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, transparent pricing</h2>
          <p className="mt-3 text-neutral-400">Start free, scale as you grow. No hidden fees, no surprises.</p>

          <div className="mt-6 inline-flex items-center rounded-full border border-neutral-800 bg-neutral-950 p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                billingCycle === "monthly" ? "bg-neutral-800 text-white" : "text-neutral-400"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                billingCycle === "yearly" ? "bg-neutral-800 text-white" : "text-neutral-400"
              }`}
            >
              Yearly <span className="text-emerald-400">-20%</span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Starter */}
          <div className="flex flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div>
              <h3 className="text-lg font-semibold">Starter</h3>
              <p className="mt-1 text-xs text-neutral-400">Perfect for side projects and small teams</p>
              <div className="mt-6 text-4xl font-extrabold">$0</div>
              <ul className="mt-6 space-y-3 text-sm text-neutral-300">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-500" /> 3 team members</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-500" /> 10 projects</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-500" /> Basic analytics</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-500" /> Community support</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-500" /> 1GB storage</li>
              </ul>
            </div>
            <Link
              href="/signup"
              className="mt-8 block text-center w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 text-sm font-medium hover:bg-neutral-800 transition"
            >
              Get Started
            </Link>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-white/30 bg-neutral-950 p-6 shadow-2xl">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-0.5 text-xs font-semibold text-black">
              Most Popular
            </span>
            <div>
              <h3 className="text-lg font-semibold">Pro</h3>
              <p className="mt-1 text-xs text-neutral-400">For growing teams that need more power</p>
              <div className="mt-6 text-4xl font-extrabold">
                ${billingCycle === "monthly" ? "29" : "23"}
                <span className="text-sm font-normal text-neutral-400">/month</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-neutral-300">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-white" /> Unlimited team members</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-white" /> Unlimited projects</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-white" /> Advanced analytics</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-white" /> Priority support</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-white" /> 100GB storage</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-white" /> Custom domains</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-white" /> API access</li>
              </ul>
            </div>
            <Link
              href="/signup"
              className="mt-8 block text-center w-full rounded-xl bg-white py-2.5 text-sm font-medium text-black hover:bg-neutral-200 transition"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Enterprise */}
          <div className="flex flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div>
              <h3 className="text-lg font-semibold">Enterprise</h3>
              <p className="mt-1 text-xs text-neutral-400">For organizations with advanced needs</p>
              <div className="mt-6 text-4xl font-extrabold">
                ${billingCycle === "monthly" ? "99" : "79"}
                <span className="text-sm font-normal text-neutral-400">/month</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-neutral-300">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-500" /> Everything in Pro</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-500" /> SSO & SAML</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-500" /> Dedicated support</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-500" /> SLA guarantee</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-500" /> Unlimited storage</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-500" /> Custom integrations</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-500" /> Audit logs</li>
              </ul>
            </div>
            <Link
              href="/login"
              className="mt-8 block text-center w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 text-sm font-medium hover:bg-neutral-800 transition"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="mx-auto max-w-5xl px-4 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to ship faster?</h2>
        <p className="mt-3 text-neutral-400">
          Join thousands of teams already building with DataFusion BI. Start free, no credit card required.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-neutral-200 transition shadow-lg shadow-white/10"
          >
            Get Started for Free
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-neutral-800 bg-neutral-900 px-6 py-3 font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
          >
            Talk to Sales
          </Link>
        </div>
        <p className="mt-4 text-xs text-neutral-500">
          Free forever for individuals. Team plans start at $29/month.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-12 text-sm text-neutral-400">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-4 md:grid-cols-5">
          <div className="col-span-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-black text-black">DF</span>
              DataFusion BI
            </div>
            <p className="mt-2 text-xs text-neutral-500">The modern platform for teams who ship fast.</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-neutral-800 px-2.5 py-1 text-xs text-neutral-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              All Systems Operational
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white">Product</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li><a href="#features" className="hover:text-white transition">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
              <li><Link href="/login" className="hover:text-white transition">Changelog</Link></li>
              <li><Link href="/login" className="hover:text-white transition">Roadmap</Link></li>
              <li><Link href="/login" className="hover:text-white transition">API</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white">Resources</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li><Link href="/login" className="hover:text-white transition">Documentation</Link></li>
              <li><Link href="/login" className="hover:text-white transition">Guides</Link></li>
              <li><Link href="/login" className="hover:text-white transition">Blog</Link></li>
              <li><Link href="/login" className="hover:text-white transition">Community</Link></li>
              <li><Link href="/login" className="hover:text-white transition">Templates</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white">Company</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li><Link href="/login" className="hover:text-white transition">About</Link></li>
              <li><Link href="/login" className="hover:text-white transition">Careers</Link></li>
              <li><Link href="/login" className="hover:text-white transition">Press</Link></li>
              <li><Link href="/login" className="hover:text-white transition">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-12 flex max-w-5xl flex-col items-center justify-between border-t border-neutral-900 px-4 pt-6 text-xs text-neutral-600 sm:flex-row">
          <p>© 2026 DataFusion, Inc. All rights reserved.</p>
          <div className="mt-4 flex gap-4 sm:mt-0">
            <a href="#" className="hover:text-neutral-400 transition">Twitter</a>
            <a href="#" className="hover:text-neutral-400 transition">GitHub</a>
            <a href="#" className="hover:text-neutral-400 transition">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
