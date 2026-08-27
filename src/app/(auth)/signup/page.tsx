import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account - BI Platform" };

export default function SignupPage() {
  return (
    <>
      <div className="mb-5">
        <h1 className="text-[22px] font-semibold leading-tight text-foreground">
          Create your workspace
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Set up an account and your first organization.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-elev-1">
        <SignupForm />
      </div>

      <p className="mt-4 text-center text-[13px] text-secondary-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-link hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
