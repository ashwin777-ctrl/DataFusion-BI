import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/current-user";

// Auth state depends on the request cookie, so never statically prerender.
export const dynamic = "force-dynamic";

/**
 * Public auth shell (login / signup). If already authenticated, skip straight to the
 * app — a signed-in user has no reason to see these pages. The centered card layout
 * is shared by both routes.
 */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (session) redirect("/app");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-plane px-6 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 text-[13px] font-medium uppercase tracking-wide text-muted-foreground"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-[3px] bg-primary"
            aria-hidden
          />
          BI Platform
        </Link>
        {children}
      </div>
    </main>
  );
}
