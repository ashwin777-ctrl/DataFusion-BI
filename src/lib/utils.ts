import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner (shadcn convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Compact number formatter for KPI values (DESIGN.md §3.5): 1,284 / 12.9K / $4.2M.
 * Full precision belongs in tooltips and the table view, not here.
 */
export function formatCompact(
  value: number,
  opts: { currency?: string; percent?: boolean } = {},
): string {
  if (!Number.isFinite(value)) return "—";
  if (opts.percent) return `${(value * 100).toFixed(1)}%`;
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const prefix = opts.currency ?? "";
  let body: string;
  if (abs >= 1_000_000_000) body = `${(abs / 1_000_000_000).toFixed(1)}B`;
  else if (abs >= 1_000_000) body = `${(abs / 1_000_000).toFixed(1)}M`;
  else if (abs >= 10_000) body = `${(abs / 1_000).toFixed(1)}K`;
  else body = abs.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return `${sign}${prefix}${body}`;
}
