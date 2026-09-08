"use client";

/**
 * Lightweight client-side application memory cache.
 * Eliminates redundant network waterfalls across tab switches (/app, /app/insights, /app/sources).
 */
export interface ClientCache {
  datasets: any[] | null;
  activeDatasetId: string | null;
  details: Record<string, any>;
  kpis: Record<string, any[]>;
  insights: Record<string, any>;
}

export const clientCache: ClientCache = {
  datasets: null,
  activeDatasetId: null,
  details: {},
  kpis: {},
  insights: {},
};
