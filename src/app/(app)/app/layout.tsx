import type { ReactNode } from "react";
import { requireOrg } from "@/lib/auth/current-user";
import { AppHeader } from "./app-header";

export const dynamic = "force-dynamic";

/**
 * The /app shell: requires an active org (requireOrg redirects to /onboarding if the
 * user belongs to none) and renders the top bar with the org switcher + sign-out.
 */
export default async function AppShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { session, orgId } = await requireOrg();
  return (
    <div className="min-h-dvh bg-plane flex flex-col">
      <AppHeader
        userEmail={session.user.email}
        userName={session.user.name}
        orgs={session.memberships}
        activeOrgId={session.activeOrg?.id ?? orgId}
      />
      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 flex-1">{children}</main>
    </div>
  );
}
