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
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { useTheme } from "next-themes";
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
  const { theme, setTheme } = useTheme();
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
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur shadow-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/app" className="flex items-center gap-2 text-[14px] font-bold text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-xs shadow">
              BI
            </span>
            <span className="hidden md:inline font-semibold tracking-tight">Confluence BI</span>
          </Link>
          <span className="text-border-strong hidden sm:inline" aria-hidden>
            /
          </span>
          <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} />
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-accent/15 text-accent font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {mounted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}

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
