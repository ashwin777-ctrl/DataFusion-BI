"use client";

import { useState, useEffect } from "react";
import { CompareWizard } from "@/components/compare/compare-wizard";
import { GitCompare, History, Clock, FileSpreadsheet, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ComparePage() {
  const [activeTab, setActiveTab] = useState<"studio" | "history" | "schedules">("studio");
  const [jobs, setJobs] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadHistory() {
    try {
      setLoading(true);
      const res = await fetch("/api/compare/jobs");
      const data = await res.json();
      if (res.ok) {
        setJobs(data.jobs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadSchedules() {
    try {
      setLoading(true);
      const res = await fetch("/api/compare/schedules");
      const data = await res.json();
      if (res.ok) {
        setSchedules(data.schedules || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    } else if (activeTab === "schedules") {
      loadSchedules();
    }
  }, [activeTab]);

  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [isDeletingJob, setIsDeletingJob] = useState(false);

  async function executeDeleteJob() {
    if (!deletingJobId) return;
    setIsDeletingJob(true);
    try {
      const res = await fetch(`/api/compare/jobs/${deletingJobId}`, { method: "DELETE" });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== deletingJobId));
        setDeletingJobId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeletingJob(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Bar with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("studio")}
            className={`flex items-center gap-2 pb-2 px-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "studio"
                ? "border-blue-500 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <GitCompare className="h-4 w-4 text-blue-500" />
            Comparison Studio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 pb-2 px-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "history"
                ? "border-blue-500 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-4 w-4 text-emerald-400" />
            History ({jobs.length > 0 ? jobs.length : "Runs"})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("schedules")}
            className={`flex items-center gap-2 pb-2 px-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "schedules"
                ? "border-blue-500 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-4 w-4 text-cyan-400" />
            Schedules
          </button>
        </div>

        {activeTab !== "studio" && (
          <Button size="sm" onClick={() => setActiveTab("studio")} className="gap-1.5 text-xs">
            <GitCompare className="h-3.5 w-3.5" />
            New Comparison
          </Button>
        )}
      </div>

      {/* Tab: Comparison Studio */}
      {activeTab === "studio" && (
        <CompareWizard onJobComplete={() => loadHistory()} />
      )}

      {/* Tab: History */}
      {activeTab === "history" && (
        <div className="stitch-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Recent Comparison Runs</h3>
              <p className="text-xs text-muted-foreground">Historical comparison audits, match rates, and downloadable reports.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={loadHistory} className="text-xs text-muted-foreground">
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">Loading comparison history...</div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-muted mx-auto flex items-center justify-center text-muted-foreground">
                <GitCompare className="h-6 w-6" />
              </div>
              <div className="text-sm font-semibold text-foreground">No comparisons run yet</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Launch the Comparison Studio to reconcile your first pair of datasets.
              </p>
              <Button size="sm" onClick={() => setActiveTab("studio")}>
                Start Comparison
              </Button>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Comparison Job</th>
                    <th className="py-2.5 px-4">Sources</th>
                    <th className="py-2.5 px-4">Match Rate</th>
                    <th className="py-2.5 px-4">Quality Score</th>
                    <th className="py-2.5 px-4">Discrepancies</th>
                    <th className="py-2.5 px-4">Executed</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-foreground">{job.name}</td>
                      <td className="py-2.5 px-4 text-muted-foreground font-mono text-[11px]">
                        {job.source1Name} ↔ {job.source2Name}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                          {job.summary?.matchRate ?? 0}%
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-cyan-400">
                        {job.summary?.qualityScore ?? "—"}/100
                      </td>
                      <td className="py-2.5 px-4 text-rose-400 font-bold">
                        {job.summary?.mismatchedCount ?? 0}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground font-mono text-[11px]">
                        {job.completedAt ? new Date(job.completedAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right flex items-center justify-end gap-1.5">
                        <a
                          href={`/api/compare/jobs/${job.id}/export?format=xlsx`}
                          download
                          className="p-1.5 rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Download Excel"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => setDeletingJobId(job.id)}
                          className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete Run"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Schedules */}
      {activeTab === "schedules" && (
        <div className="stitch-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Scheduled Reconciliation Jobs</h3>
              <p className="text-xs text-muted-foreground">Automated comparisons executed on background schedules.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={loadSchedules} className="text-xs text-muted-foreground">
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">Loading schedules...</div>
          ) : schedules.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Clock className="h-8 w-8 mx-auto text-muted-foreground" />
              <div className="text-sm font-semibold text-foreground">No recurring schedules yet</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Configure a comparison in the Studio and save it as an automated recurring job in Step 7.
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Schedule Name</th>
                    <th className="py-2.5 px-4">Cron Expression</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Next Run</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-foreground">{s.name}</td>
                      <td className="py-2.5 px-4 font-mono">{s.cronExpression}</td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                          {s.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground font-mono">
                        {s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Delete Run Confirmation Modal */}
      {deletingJobId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingJob) setDeletingJobId(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/10">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Comparison Run</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Irreversible operation</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete this comparison run? All discrepancy metrics and audit logs for this run will be permanently purged.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDeletingJob}
                onClick={() => setDeletingJobId(null)}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isDeletingJob}
                onClick={executeDeleteJob}
                className="gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-xl"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeletingJob ? "Deleting..." : "Confirm Deletion"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
