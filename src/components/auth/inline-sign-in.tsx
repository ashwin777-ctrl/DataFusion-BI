"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction } from "@/lib/auth/actions";
import { EMPTY_FORM_STATE } from "@/lib/auth/form-state";
import { ArrowRight, Sparkles, Shield } from "lucide-react";

export function InlineSignIn() {
  const [state, formAction, pending] = useActionState(loginAction, EMPTY_FORM_STATE);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleFillDemo = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
  };

  return (
    <div id="inline-signin-card" className="relative w-full max-w-md mx-auto rounded-2xl border border-white/15 bg-[#0a0a0a]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl text-left">
      {/* Specular Top Glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      
      {/* Badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-mono text-zinc-300">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>PORTAL AUTH</span>
        </div>
        <span className="text-[11px] font-mono text-zinc-400">PostgreSQL RLS</span>
      </div>

      <div className="mb-5">
        <h3 className="text-xl font-bold tracking-tight text-white font-display">
          Sign In to Workspace
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          Access your real-time analytics dashboard, DuckDB pipelines, and 3D data graph.
        </p>
      </div>

      {/* Quick 1-Click Demo Fill */}
      <div className="mb-5 p-3 rounded-xl bg-[#121212] border border-white/10 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-white" /> Quick Demo Login:
          </span>
          <span className="text-[10px] font-mono text-emerald-400 font-semibold">Active User</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleFillDemo("ashwin@datafusion.io", "Password123!")}
            className="flex-1 py-1 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[11px] font-mono font-medium transition-colors border border-white/10 text-center"
          >
            ashwin@datafusion.io
          </button>
        </div>
      </div>

      {/* Embedded Working Form */}
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="inline-email" className="block text-xs font-medium text-zinc-300 mb-1.5">
            Work Email
          </label>
          <input
            id="inline-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@company.com"
            required
            className="w-full h-10 px-3 rounded-lg bg-black border border-white/15 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all font-sans"
          />
          {state.fieldErrors?.email ? (
            <p className="mt-1 text-xs text-rose-400 font-medium">
              {state.fieldErrors.email[0]}
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="inline-password" className="block text-xs font-medium text-zinc-300">
              Password
            </label>
            <span className="text-[11px] text-zinc-400">Min 8 chars</span>
          </div>
          <input
            id="inline-password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••••••"
            required
            className="w-full h-10 px-3 rounded-lg bg-black border border-white/15 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all font-sans"
          />
          {state.fieldErrors?.password ? (
            <p className="mt-1 text-xs text-rose-400 font-medium">
              {state.fieldErrors.password[0]}
            </p>
          ) : null}
        </div>

        {state.formError ? (
          <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300">
            {state.formError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full h-11 rounded-lg bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
        >
          {pending ? (
            <span>Authenticating...</span>
          ) : (
            <>
              <span>Sign In to Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Navigation Footers: Dedicated Login Page & Sign Up */}
      <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Prefer dedicated page?</span>
          <Link
            href="/login"
            className="text-white hover:text-zinc-300 font-semibold inline-flex items-center gap-1 group"
          >
            <span>Open Dedicated Login Page</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>New organization?</span>
          <Link href="/signup" className="text-zinc-300 hover:text-white font-medium underline underline-offset-4">
            Create new workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
