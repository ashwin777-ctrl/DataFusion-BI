"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";
import type { OrgSummary } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { OrgSwitcher } from "./org-switcher";
import {
  LayoutDashboard,
  Database,
  GitMerge,
  GitCompare,
  Sparkles,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useEffect, useState } from "react";

export function AppHeader({
  userEmail,
  userName,
  orgs,
  activeOrgId,
}: {
  userEmail: string;
  userName: string | null;
  orgs: OrgSummary[];
  activeOrgId: string;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { label: "Dashboard", href: "/app", icon: LayoutDashboard },
    { label: "Data Sources", href: "/app/sources", icon: Database },
    { label: "Data Prep & Model", href: "/app/prep", icon: GitMerge },
    { label: "Data Compare", href: "/app/compare", icon: GitCompare },
    { label: "Insights", href: "/app/insights", icon: Sparkles },
    { label: "Reports & Export", href: "/app/reports", icon: FileText },
    { label: "Settings", href: "/app/settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/75 dark:bg-[#101012]/75 backdrop-blur-2xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-colors">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/app" className="flex items-center gap-2.5 group">
            <span className="flex h-7.5 w-7.5 items-center justify-center rounded-[10px] bg-blue-600 dark:bg-blue-500 text-white font-bold text-xs shadow-[0_2px_6px_rgba(0,113,227,0.35)] group-hover:scale-105 transition-all">
              DF
            </span>
            <div className="hidden md:flex flex-col">
              <span className="font-semibold text-[14px] tracking-tight text-foreground leading-none">DataFusion</span>
              <span className="text-[10px] font-mono tracking-wider text-muted-foreground font-medium leading-none mt-1">
                ENTERPRISE BI
              </span>
            </div>
          </Link>
          <span className="text-muted-foreground/40 hidden sm:inline" aria-hidden>
            /
          </span>
          <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} />

          {/* Live Cluster Status Pill */}
          <div className="hidden 2xl:flex items-center gap-2 pl-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              LIVE DUAL-SYNC
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] text-muted-foreground text-[10px] font-mono uppercase tracking-wider">
              PROD-US-EAST
            </span>
          </div>
        </div>

        {/* Center navigation tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-black/[0.03] dark:bg-white/[0.04] p-1 rounded-full border border-black/[0.04] dark:border-white/[0.06]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 ${
                  active
                    ? "bg-white dark:bg-white/15 text-foreground font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {mounted && <ThemeSwitcher className="scale-95" />}

          <span className="hidden xl:inline max-w-[10rem] truncate text-[12px] text-muted-foreground border-l border-border pl-2">
            {userName ?? userEmail}
          </span>

          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm" className="h-8 rounded-full gap-1 text-xs text-muted-foreground hover:text-destructive">
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </form>
        </div>
      </div>

      {/* Mobile/Tablet Subnav */}
      <div className="flex lg:hidden border-t border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#101012]/80 backdrop-blur-lg px-4 py-1.5 overflow-x-auto gap-1.5 w-full max-w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                active
                  ? "bg-blue-600 text-white font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
