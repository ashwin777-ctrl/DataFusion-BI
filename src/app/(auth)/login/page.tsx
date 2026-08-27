import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in - BI Platform" };

export default function LoginPage() {
  return (
    <>
      <div className="mb-5">
        <h1 className="text-[22px] font-semibold leading-tight text-foreground">
          Sign in
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Welcome back. Enter your credentials to continue.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-elev-1">
        <LoginForm />
      </div>

      <p className="mt-4 text-center text-[13px] text-secondary-foreground">
        No account?{" "}
        <Link href="/signup" className="text-link hover:underline">
          Create one
        </Link>
      </p>
    </>
  );
}
