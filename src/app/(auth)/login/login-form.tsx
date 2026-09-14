"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction } from "@/lib/auth/actions";
import { EMPTY_FORM_STATE } from "@/lib/auth/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Sparkles } from "lucide-react";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    EMPTY_FORM_STATE,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleFillDemo = () => {
    setEmail("ashwin@datafusion.io");
    setPassword("Admin@123456");
  };

  return (
    <div className="space-y-4">
      {/* Demo Credentials Quick-Fill helper */}
      <div className="rounded-lg border border-indigo-500/20 bg-indigo-50/60 dark:bg-indigo-950/30 p-3 text-xs flex items-center justify-between gap-3">
        <div>
          <span className="font-semibold text-indigo-900 dark:text-indigo-200">Demo Account Available</span>
          <p className="text-[11px] text-indigo-700 dark:text-indigo-300/80">ashwin@datafusion.io / Admin@123456</p>
        </div>
        <button
          type="button"
          onClick={handleFillDemo}
          className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] flex items-center gap-1 shadow-sm shrink-0"
        >
          <Sparkles className="w-3 h-3" />
          <span>Auto Fill</span>
        </button>
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={state.fieldErrors?.email ? true : undefined}
            required
            autoFocus
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={state.fieldErrors?.password}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={state.fieldErrors?.password ? true : undefined}
            required
          />
        </Field>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-[12px] text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {state.formError ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
          >
            {state.formError}
          </p>
        ) : null}

        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
