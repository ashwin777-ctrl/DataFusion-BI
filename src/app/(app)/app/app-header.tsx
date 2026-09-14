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
  ChevronDown,
  Check,
} from "lucide-react";
import { clientCache } from "@/lib/cache/client-cache";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useEffect, useState, useRef } from "react";

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
  const [timeRange, setTimeRange] = useState(() => clientCache.activeTimeRange || "Last 30 days");
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "PostgreSQL 16 Connected", desc: "Port 5434 active dual-sync verified", time: "Just now", unread: true },
    { id: 2, title: "DuckDB Vectorized Engine", desc: "In-memory columnar execution primed", time: "5m ago", unread: true },
    { id: 3, title: "System Ready", desc: "Zero-copy Snappy Parquet storage ready", time: "12m ago", unread: false },
  ]);

  const notifRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (timeRef.current && !timeRef.current.contains(e.target as Node)) {
        setShowTimeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between bg-white/90 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-20 transition-colors">
      {/* Left Title & Org */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{getPageTitle()}</h1>
        <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4">
          <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} />
        </div>
      </div>

      {/* Right Actions & Profile */}
      <div className="flex items-center gap-3">
        {/* Date Filter Dropdown */}
        <div className="relative hidden md:block" ref={timeRef}>
          <button
            type="button"
            onClick={() => setShowTimeDropdown(!showTimeDropdown)}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 px-3 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600 transition"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>{timeRange}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showTimeDropdown && (
            <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-xl z-50 text-xs">
              {["Today", "Last 7 days", "Last 30 days", "Last 90 days", "This Year"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setTimeRange(opt);
                    clientCache.setTimeRange(opt);
                    setShowTimeDropdown(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <span>{opt}</span>
                  {timeRange === opt && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme switcher */}
        {mounted && <ThemeSwitcher className="scale-90" />}

        {/* Notification Bell & Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            title="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 rounded-lg transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-950"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xl z-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  System Alerts
                </span>
                <button
                  type="button"
                  onClick={() => setNotifications(notifications.map((n) => ({ ...n, unread: false })))}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Mark all read
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-64 overflow-y-auto">
                {notifications.map((notif) => (
                  <div key={notif.id} className="py-2.5 flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {notif.unread && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>}
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{notif.title}</p>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{notif.desc}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">{notif.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Initials Avatar */}
        <div
          title={`${userName || "User"} (${userEmail})`}
          className="h-9 w-9 rounded-full bg-indigo-50 dark:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-xs font-semibold text-indigo-600 dark:text-indigo-300 select-none shrink-0"
        >
          {initials}
        </div>

        {/* Sign Out */}
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
