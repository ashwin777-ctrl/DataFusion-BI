import type { ReactNode } from "react";
import { requireOrg } from "@/lib/auth/current-user";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

export const dynamic = "force-dynamic";

export default async function AppShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { session, orgId } = await requireOrg();
  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex min-h-screen antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          userEmail={session.user.email}
          userName={session.user.name}
          orgs={session.memberships}
          activeOrgId={session.activeOrg?.id ?? orgId}
        />
        <main className="flex-1 min-w-0 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
