"use client";

import { useState } from "react";
import { 
  Building2, 
  FolderKanban, 
  Users2, 
  Lock, 
  KeyRound, 
  Check, 
  ArrowDown
} from "lucide-react";

type RoleScope = "admin" | "analyst" | "viewer";

export function SecurityMultiTenancyDiagram() {
  const [activeRole, setActiveRole] = useState<RoleScope>("analyst");
  const [selectedWorkspace, setSelectedWorkspace] = useState<"finance" | "growth">("finance");

  return (
    <div className="w-full rounded-[24px] bg-white dark:bg-[#101012] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden">
      {/* Header Bar */}
      <div className="px-6 sm:px-8 py-5 border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FBFBFD] dark:bg-[#151518]">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#34C759]/10 text-[#34C759]">
              <Lock className="h-3 w-3" />
              Multi-Tenant Isolation
            </span>
            <span className="text-xs text-[#86868B]">Hardware-Enforced Security</span>
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] mt-1">
            Layered Multi-Tenancy & Row-Level Security
          </h3>
        </div>

        {/* Role Simulator Selector */}
        <div className="flex items-center gap-1.5 bg-[#E5E5EA]/60 dark:bg-[#2C2C2E]/60 p-1 rounded-full text-xs">
          <span className="text-[11px] font-medium text-[#86868B] px-2">Role Scope:</span>
          {(["admin", "analyst", "viewer"] as RoleScope[]).map((role) => (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className={`px-3 py-1 rounded-full font-medium transition-all capitalize ${
                activeRole === role
                  ? "bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm"
                  : "text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layered Flow */}
      <div className="p-6 sm:p-8">
        <div className="relative flex flex-col gap-3">
          
          {/* Layer 1: Organization */}
          <div className="p-4 sm:p-5 rounded-[20px] bg-[#FBFBFD] dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] transition-all hover:border-[#0071E3]/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-[14px] bg-[#0071E3]/10 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center font-bold">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#0071E3] dark:text-[#0A84FF]">LAYER 1</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#636366] dark:text-[#AEAEB2] font-mono">SAML 2.0 / SCIM</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Enterprise Organization Tenant
                  </h4>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#86868B]">
                <span className="h-2 w-2 rounded-full bg-[#34C759]" />
                <span>Tenant ID: <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">tenant_acme_corp_01</strong></span>
              </div>
            </div>
          </div>

          <div className="flex justify-center -my-1 text-[#86868B]">
            <ArrowDown className="h-4 w-4 opacity-50" />
          </div>

          {/* Layer 2: Workspaces */}
          <div className="p-4 sm:p-5 rounded-[20px] bg-[#FBFBFD] dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-[14px] bg-[#5856D6]/10 text-[#5856D6] dark:text-[#AF52DE] flex items-center justify-center font-bold">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#5856D6] dark:text-[#AF52DE]">LAYER 2</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#636366] dark:text-[#AEAEB2]">Workspace Boundary</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Isolated Departmental Workspaces
                  </h4>
                </div>
              </div>
              {/* Workspace Switcher */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedWorkspace("finance")}
                  className={`px-3 py-1 text-xs rounded-full border transition-all ${
                    selectedWorkspace === "finance"
                      ? "bg-[#5856D6] text-white border-[#5856D6]"
                      : "bg-white dark:bg-[#1C1C1E] border-[#E5E5EA] dark:border-[#2C2C2E] text-[#86868B]"
                  }`}
                >
                  Finance Workspace
                </button>
                <button
                  onClick={() => setSelectedWorkspace("growth")}
                  className={`px-3 py-1 text-xs rounded-full border transition-all ${
                    selectedWorkspace === "growth"
                      ? "bg-[#5856D6] text-white border-[#5856D6]"
                      : "bg-white dark:bg-[#1C1C1E] border-[#E5E5EA] dark:border-[#2C2C2E] text-[#86868B]"
                  }`}
                >
                  Growth Marketing
                </button>
              </div>
            </div>
            <div className="text-xs text-[#86868B] pl-13">
              Strict compartmentalization: dataset schemas, query caches, and reports are partitioned by workspace keys.
            </div>
          </div>

          <div className="flex justify-center -my-1 text-[#86868B]">
            <ArrowDown className="h-4 w-4 opacity-50" />
          </div>

          {/* Layer 3: Users & Access Control */}
          <div className="p-4 sm:p-5 rounded-[20px] bg-[#FBFBFD] dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-[14px] bg-[#FF9500]/10 text-[#FF9500] flex items-center justify-center font-bold">
                  <Users2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#FF9500]">LAYER 3</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#636366] dark:text-[#AEAEB2] font-mono">
                      Role: {activeRole.toUpperCase()}
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Cryptographic User Identity & RBAC
                  </h4>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#86868B]">Session:</span>
                <span className="font-mono bg-[#E5E5EA] dark:bg-[#2C2C2E] px-2 py-0.5 rounded text-[#1D1D1F] dark:text-[#F5F5F7]">
                  usr_jwt_verified
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-center -my-1 text-[#86868B]">
            <ArrowDown className="h-4 w-4 opacity-50" />
          </div>

          {/* Layer 4: Data Layer & Row-Level Security Policy Engine */}
          <div className="p-5 sm:p-6 rounded-[20px] bg-white dark:bg-[#1A1A1E] border-2 border-[#34C759]/40 shadow-sm transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-[14px] bg-[#34C759]/15 text-[#34C759] flex items-center justify-center font-bold">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#34C759]">LAYER 4 & 5</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#34C759]/10 text-[#34C759] font-medium">
                      Active RLS Policy
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Hardware-Level Postgres & DuckDB Row Policy
                  </h4>
                </div>
              </div>
              <div className="text-xs font-mono text-[#34C759] bg-[#34C759]/10 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                Zero Data Leakage Enforced
              </div>
            </div>

            {/* SQL Policy Snippet */}
            <div className="p-3.5 rounded-[14px] bg-[#F5F5F7] dark:bg-[#0A0A0C] border border-[#E5E5EA] dark:border-[#2C2C2E] font-mono text-[11px] sm:text-xs text-[#1D1D1F] dark:text-[#F5F5F7] leading-relaxed overflow-x-auto">
              <span className="text-[#AF52DE]">CREATE POLICY</span> tenant_isolation_policy <span className="text-[#AF52DE]">ON</span> analytics_events<br />
              <span className="text-[#AF52DE]">FOR SELECT USING</span> (<br />
              &nbsp;&nbsp;tenant_id = <span className="text-[#0071E3] dark:text-[#0A84FF]">current_setting</span>(<span className="text-[#34C759]">&apos;app.tenant_id&apos;</span>) <br />
              &nbsp;&nbsp;<span className="text-[#AF52DE]">AND</span> workspace_id = <span className="text-[#34C759]">&apos;ws_{selectedWorkspace}&apos;</span><br />
              &nbsp;&nbsp;{activeRole === "viewer" ? (
                <span className="text-[#FF9500]">&nbsp;&nbsp;AND is_sensitive = false -- Viewer Masking Applied</span>
              ) : activeRole === "analyst" ? (
                <span className="text-[#0071E3] dark:text-[#0A84FF]">&nbsp;&nbsp;AND anonymize_pii(record_payload) -- Analyst PII Masked</span>
              ) : (
                <span className="text-[#34C759]">&nbsp;&nbsp;-- Full Admin Clearance Granted</span>
              )}<br />
              );
            </div>

            {/* Policy Enforcement Live Feedback */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-[12px] bg-[#FBFBFD] dark:bg-[#151518] border border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
                <span className="text-[#86868B]">Tenant Boundary:</span>
                <span className="font-semibold text-[#34C759]">Strict Match</span>
              </div>
              <div className="p-2.5 rounded-[12px] bg-[#FBFBFD] dark:bg-[#151518] border border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
                <span className="text-[#86868B]">PII Redaction:</span>
                <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {activeRole === "admin" ? "Bypassed" : "SHA-256 Masked"}
                </span>
              </div>
              <div className="p-2.5 rounded-[12px] bg-[#FBFBFD] dark:bg-[#151518] border border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
                <span className="text-[#86868B]">Row Clearance:</span>
                <span className="font-semibold text-[#0071E3] dark:text-[#0A84FF]">
                  {activeRole === "admin" ? "100% (All)" : activeRole === "analyst" ? "88% (De-identified)" : "42% (Aggregates Only)"}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
