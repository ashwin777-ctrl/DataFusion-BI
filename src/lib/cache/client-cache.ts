"use client";

/**
 * Lightweight client-side application memory cache with LRU bounding.
 * Eliminates redundant network waterfalls across tab switches (/app, /app/insights, /app/sources)
 * while preventing memory unbounded growth.
 */
function pruneRecord(rec: Record<string, any>, maxEntries = 5) {
  const keys = Object.keys(rec);
  if (keys.length > maxEntries) {
    const toRemove = keys.slice(0, keys.length - maxEntries);
    for (const k of toRemove) {
      delete rec[k];
    }
  }
}

export interface ClientCache {
  sources: any[] | null;
  datasets: any[] | null;
  activeDatasetId: string | null;
  details: Record<string, any>;
  kpis: Record<string, any[]>;
  insights: Record<string, any>;
  charts: Record<string, any>;
  setDetail: (id: string, detail: any) => void;
  setKpi: (id: string, kpiList: any[]) => void;
  setInsight: (id: string, rep: any) => void;
  setChart: (key: string, data: any) => void;
}

export const clientCache: ClientCache = {
  sources: null,
  datasets: null,
  activeDatasetId: null,
  details: {},
  kpis: {},
  insights: {},
  charts: {},
  setDetail(id: string, detail: any) {
    this.details[id] = detail;
    pruneRecord(this.details, 3);
  },
  setKpi(id: string, kpiList: any[]) {
    this.kpis[id] = kpiList;
    pruneRecord(this.kpis, 3);
  },
  setInsight(id: string, rep: any) {
    this.insights[id] = rep;
    pruneRecord(this.insights, 3);
  },
  setChart(key: string, data: any) {
    this.charts[key] = data;
    pruneRecord(this.charts, 5);
  },
};
