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
    { label: "Insights", href: "/app/insights", icon: Sparkles },
    { label: "Reports & Export", href: "/app/reports", icon: FileText },
    { label: "Settings", href: "/app/settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 stitch-header border-b border-border bg-card/90 backdrop-blur-xl shadow-sm transition-colors">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/app" className="flex items-center gap-2 text-[14px] font-bold text-foreground group">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white border border-white/20 font-black text-xs shadow-sm group-hover:scale-105 group-hover:border-white/40 transition-all">
              DF
            </span>
            <div className="hidden md:flex flex-col">
              <span className="font-bold tracking-tight text-white leading-none">DataFusion</span>
              <span className="text-[10px] font-mono tracking-wider text-zinc-400 font-semibold leading-none mt-0.5">
                ENTERPRISE BI
              </span>
            </div>
          </Link>
          <span className="text-zinc-700 hidden sm:inline" aria-hidden>
            /
          </span>
          <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} />

          {/* Stitch Cluster Status Badge */}
          <div className="hidden 2xl:flex items-center gap-2 pl-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE DUAL-SYNC
            </span>
            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-white/10 text-zinc-300 text-[10px] font-mono uppercase tracking-wider">
              PROD-US-EAST
            </span>
          </div>
        </div>

        {/* Center navigation tabs */}
        <nav className="hidden lg:flex items-center gap-1">
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  active
                    ? "bg-white/10 text-white border border-white/20 font-semibold shadow-sm"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-white" : "text-zinc-400"}`} />
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
            <Button type="submit" variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground hover:text-destructive">
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </form>
        </div>
      </div>

      {/* Mobile/Tablet Subnav */}
      <div className="flex lg:hidden border-t border-border bg-card px-4 py-1.5 overflow-x-auto gap-2">
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
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                active
                  ? "bg-accent/15 text-accent font-semibold"
                  : "text-muted-foreground hover:text-foreground"
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
