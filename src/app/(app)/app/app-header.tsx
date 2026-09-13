"use client";

import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";
import type { OrgSummary } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { OrgSwitcher } from "./org-switcher";
import {
  Calendar,
  Bell,
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

  const getPageTitle = () => {
    if (pathname === "/app") return "Overview";
    if (pathname.startsWith("/app/sources")) return "Pipeline & Sources";
    if (pathname.startsWith("/app/prep")) return "Data Prep & Model";
    if (pathname.startsWith("/app/compare")) return "Data Compare";
    if (pathname.startsWith("/app/insights")) return "Forecasting & Insights";
    if (pathname.startsWith("/app/reports")) return "Reports";
    if (pathname.startsWith("/app/settings")) return "Settings";
    return "Overview";
  };

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : (userEmail?.slice(0, 2) || "DF").toUpperCase();

  return (
    <header className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
      {/* Left Title & Org */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-white tracking-tight">{getPageTitle()}</h1>
        <div className="hidden sm:flex items-center gap-2 border-l border-slate-800 pl-4">
          <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} />
        </div>
      </div>

      {/* Right Actions & Profile */}
      <div className="flex items-center gap-3">
        {/* Date Filter */}
        <div className="hidden md:flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-lg text-xs text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Last 30 days</span>
        </div>

        {/* Theme switcher */}
        {mounted && <ThemeSwitcher className="scale-90" />}

        {/* Notification Bell */}
        <button
          title="Notifications"
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 rounded-lg transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-slate-950"></span>
        </button>

        {/* User Initials Avatar */}
        <div
          title={userName || userEmail}
          className="h-9 w-9 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-xs font-semibold text-indigo-300 select-none shrink-0"
        >
          {initials}
        </div>

        {/* Sign Out */}
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
