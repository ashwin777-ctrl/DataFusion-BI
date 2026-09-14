"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid business email address.");
      return;
    }
    setError(null);
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <>
      <div className="mb-5">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to sign in</span>
        </Link>
        <h1 className="text-[22px] font-semibold leading-tight text-foreground flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-indigo-500" />
          Reset password
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Enter your account email to receive a password recovery link.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-elev-1">
        {submitted ? (
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Password reset link sent</h3>
              <p className="text-xs text-muted-foreground mt-1">
                If an account exists for <strong className="text-foreground">{email}</strong>, we have dispatched recovery instructions.
              </p>
            </div>
            <Link href="/login" className="inline-block pt-2">
              <Button size="sm" variant="outline" className="text-xs">
                Return to sign in
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field label="Email address" htmlFor="email" error={error || undefined}>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </Field>

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
              disabled={submitting}
            >
              {submitting ? "Sending recovery link..." : "Send reset link"}
            </Button>
          </form>
        )}
      </div>

      <p className="mt-4 text-center text-[13px] text-secondary-foreground">
        Remembered your password?{" "}
        <Link href="/login" className="text-link hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
