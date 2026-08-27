"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  FileSpreadsheet,
  FileCode,
  Printer,
  AlertCircle,
} from "lucide-react";

export default function ReportsPage() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDatasets() {
      try {
        setLoading(true);
        const res = await fetch("/api/datasets");
        const data = await res.json();
        if (res.ok && data.datasets?.length > 0) {
          setDatasets(data.datasets);
          setActiveDatasetId(data.datasets[0].id);
        }
      } catch {
        setError("Failed to load datasets");
      } finally {
        setLoading(false);
      }
    }
    loadDatasets();
  }, []);

  useEffect(() => {
    if (!activeDatasetId) return;

    async function loadPreview() {
      try {
        const res = await fetch(`/api/datasets/${activeDatasetId}/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format: "pdf" }),
        });

        if (res.ok) {
          const html = await res.text();
          setPreviewHtml(html);
        }
      } catch {
        // ignore
      }
    }
    loadPreview();
  }, [activeDatasetId]);

  async function handleDownload(format: "pdf" | "xlsx" | "csv") {
    if (!activeDatasetId) return;

    try {
      setExportingFormat(format);
      setError(null);

      const res = await fetch(`/api/datasets/${activeDatasetId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });

      if (!res.ok) {
        throw new Error("Export failed");
      }

      if (format === "pdf") {
        // Open printable HTML report in a new tab for printing / PDF saving
        const html = await res.text();
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, "_blank");
        if (win) {
          win.focus();
        }
      } else {
        // Direct file download
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const currentDs = datasets.find((d) => d.id === activeDatasetId);
        const baseName = (currentDs?.name || "report").replace(/[^a-z0-9_]/gi, "_");
        a.download = `${baseName}.${format === "xlsx" ? "xlsx" : "csv"}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      setError(`Failed to export ${format.toUpperCase()}`);
    } finally {
      setExportingFormat(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-96 bg-card rounded-xl border border-border" />
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="p-8 text-center space-y-4 rounded-xl border border-dashed border-border bg-card">
        <FileText className="h-8 w-8 text-primary mx-auto" />
        <h2 className="text-lg font-semibold text-foreground">No datasets configured for reporting</h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Connect your sources to generate executive reports and multi-format exports.
        </p>
        <Link href="/app/sources">
          <Button size="sm">Go to Data Sources</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Executive Reports & Export Center
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Export production BI reports to PDF/Print, formatted Excel (.xlsx) workbooks with summaries, or raw CSV.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={activeDatasetId || ""}
            onChange={(e) => setActiveDatasetId(e.target.value)}
            className="rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-semibold text-foreground"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Export Format Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 flex flex-col justify-between space-y-4 border-border hover:border-primary/40 transition-all shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-rose-600">
              <Printer className="h-5 w-5" />
              <h3 className="font-bold text-foreground text-base">Executive PDF Report</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Clean board-ready document with executive summary, verified KPI ribbon, key findings, and strategic recommendations.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => handleDownload("pdf")}
            disabled={exportingFormat !== null}
            className="w-full gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
          >
            <Printer className="h-4 w-4" />
            {exportingFormat === "pdf" ? "Rendering..." : "Open Printable / Save PDF"}
          </Button>
        </Card>

        <Card className="p-5 flex flex-col justify-between space-y-4 border-border hover:border-primary/40 transition-all shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-600">
              <FileSpreadsheet className="h-5 w-5" />
              <h3 className="font-bold text-foreground text-base">Formatted Excel (.xlsx)</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Multi-tab workbook containing an Executive KPI summary sheet with styled headers plus complete raw data records.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => handleDownload("xlsx")}
            disabled={exportingFormat !== null}
            className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Download className="h-4 w-4" />
            {exportingFormat === "xlsx" ? "Generating..." : "Download Excel (.xlsx)"}
          </Button>
        </Card>

        <Card className="p-5 flex flex-col justify-between space-y-4 border-border hover:border-primary/40 transition-all shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-600">
              <FileCode className="h-5 w-5" />
              <h3 className="font-bold text-foreground text-base">Raw Dataset CSV</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Clean, comma-delimited export of all consolidated records for external pipeline consumption.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload("csv")}
            disabled={exportingFormat !== null}
            className="w-full gap-1.5"
          >
            <Download className="h-4 w-4" />
            {exportingFormat === "csv" ? "Exporting..." : "Download Raw CSV"}
          </Button>
        </Card>
      </div>

      {/* Report Document Preview */}
      <Card className="p-6 space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Live Report Preview
          </h2>
          <Badge variant="outline" className="text-xs font-mono">
            A4 Standard Format
          </Badge>
        </div>

        {previewHtml ? (
          <div className="rounded-lg border border-border overflow-hidden bg-white shadow-inner">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[650px] border-none"
              title="Report Preview"
            />
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
            Rendering preview...
          </div>
        )}
      </Card>
    </div>
  );
}
