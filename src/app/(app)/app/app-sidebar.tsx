"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  GitMerge,
  GitCompare,
  TrendingUp,
  FileBarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navLinks = [
    { label: "Overview", href: "/app", icon: LayoutDashboard },
    { label: "Pipeline & Sources", href: "/app/sources", icon: GitBranch },
    { label: "Data Prep & Model", href: "/app/prep", icon: GitMerge },
    { label: "Data Compare", href: "/app/compare", icon: GitCompare },
    { label: "Forecasting & Insights", href: "/app/insights", icon: TrendingUp },
    { label: "Reports", href: "/app/reports", icon: FileBarChart },
    { label: "Settings", href: "/app/settings", icon: Settings },
  ];

  return (
    <aside
      id="sidebar"
      className={`${
        collapsed ? "w-20" : "w-64"
      } transition-all duration-300 ease-in-out border-r border-slate-800 bg-slate-900/60 backdrop-blur-xl flex flex-col shrink-0 sticky top-0 h-screen z-30`}
    >
      {/* Brand Logo */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800">
        <Link href="/app" className="flex items-center gap-3 overflow-hidden">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30 shrink-0">
            DF
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
                DataFusion <span className="text-indigo-400 font-semibold text-xs">BI</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                SalesOps Engine
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              } ${collapsed ? "justify-center px-0" : ""}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="nav-label truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Collapse Toggle Button */}
      <div className="p-3 border-t border-slate-800">
        <button
          id="collapseBtn"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span className="nav-label">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
