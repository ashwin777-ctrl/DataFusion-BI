import { type DuckDBConnection } from "@duckdb/node-api";
import { queryDuckDB } from "./duckdb";
import { type DatasetProfile } from "./profile";
import { type KpiMetric, formatKpiValue } from "./kpi-engine";

export interface BusinessInsight {
  id: string;
  category: "driver" | "trend" | "anomaly" | "opportunity" | "risk";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  metric?: string;
  dimension?: string;
  value?: string | number;
  confidence: number; // 0.0 - 1.0
  recommendation?: string;
}

export interface InsightsReport {
  executiveSummary: string;
  keyFindings: string[];
  insights: BusinessInsight[];
  dataQualitySummary: {
    totalRows: number;
    completenessPercentage: number;
    issuesFound: string[];
  };
}

/**
 * Generate deep, defensible business insights from actual dataset statistics.
 */
export async function generateDatasetInsights(
  conn: DuckDBConnection,
  parquetPath: string,
  profile: DatasetProfile,
  _kpis: KpiMetric[],
): Promise<InsightsReport> {
  const normPath = parquetPath.replace(/\\/g, "/");
  const insights: BusinessInsight[] = [];
  const keyFindings: string[] = [];

  const primaryMeasure = profile.suggestedDefaultMeasure || profile.measures[0]?.name;
  const primaryDimension = profile.suggestedDefaultDimension || profile.dimensions[0]?.name;
  const primaryDate = profile.suggestedPrimaryDate || profile.temporalColumns[0]?.name;

  // 1. Pareto / Concentration Analysis (80/20 Rule)
  if (primaryDimension && primaryMeasure) {
    try {
      const pDim = `"${primaryDimension.replace(/"/g, '""')}"`;
      const pMeas = `"${primaryMeasure.replace(/"/g, '""')}"`;

      const paretoSql = `
        WITH ranked AS (
          SELECT 
            ${pDim} as dim_val,
            SUM(TRY_CAST(${pMeas} AS DOUBLE)) as total_meas
          FROM read_parquet('${normPath}')
          WHERE ${pDim} IS NOT NULL AND ${pMeas} IS NOT NULL
          GROUP BY ${pDim}
          ORDER BY total_meas DESC
        ),
        totals AS (
          SELECT 
            SUM(total_meas) as grand_total,
            COUNT(*) as total_categories
          FROM ranked
        )
        SELECT 
          r.dim_val,
          r.total_meas,
          t.grand_total,
          t.total_categories,
          (r.total_meas / NULLIF(t.grand_total, 0)) * 100 as share_pct
        FROM ranked r, totals t
        LIMIT 5;
      `;

      const paretoRes = await queryDuckDB<{
        dim_val: string;
        total_meas: number;
        grand_total: number;
        total_categories: number;
        share_pct: number;
      }>(conn, paretoSql);

      if (paretoRes.length > 0 && paretoRes[0] && paretoRes[0].grand_total > 0) {
        const top1 = paretoRes[0];
        const top3Share = paretoRes.slice(0, 3).reduce((acc, r) => acc + Number(r.share_pct || 0), 0);

        if (top1.share_pct > 35) {
          insights.push({
            id: "concentration_top1",
            category: "risk",
            title: `High Revenue Concentration in ${top1.dim_val}`,
            description: `The top segment "${top1.dim_val}" generates ${top1.share_pct.toFixed(1)}% (${formatKpiValue(top1.total_meas, "currency")}) of total ${primaryMeasure.replace(/_/g, " ")}. Relying heavily on one segment presents vulnerability to shifts in that segment.`,
            impact: "high",
            metric: primaryMeasure,
            dimension: primaryDimension,
            confidence: 0.95,
            recommendation: `Develop retention strategies for ${top1.dim_val} while investing in emerging underrepresented segments to diversify portfolio risk.`,
          });
          keyFindings.push(`Top segment "${top1.dim_val}" commands a dominant ${top1.share_pct.toFixed(1)}% share of ${primaryMeasure.replace(/_/g, " ")}.`);
        } else if (top3Share > 60) {
          insights.push({
            id: "concentration_top3",
            category: "driver",
            title: `Top 3 Segments Drive ${top3Share.toFixed(1)}% of Activity`,
            description: `The leading 3 ${primaryDimension.replace(/_/g, " ")}s (${paretoRes.slice(0, 3).map((r) => `"${r.dim_val}"`).join(", ")}) account for ${top3Share.toFixed(1)}% of aggregate ${primaryMeasure.replace(/_/g, " ")}.`,
            impact: "medium",
            metric: primaryMeasure,
            dimension: primaryDimension,
            confidence: 0.9,
            recommendation: `Focus marketing, capacity, and account management resources on these core driver segments.`,
          });
          keyFindings.push(`Top 3 ${primaryDimension.replace(/_/g, " ")}s deliver ${top3Share.toFixed(1)}% of total volume.`);
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Temporal Trend / Velocity Analysis
  if (primaryDate && primaryMeasure) {
    try {
      const pDate = `"${primaryDate.replace(/"/g, '""')}"`;
      const pMeas = `"${primaryMeasure.replace(/"/g, '""')}"`;

      const trendSql = `
        SELECT 
          strftime(TRY_CAST(${pDate} AS TIMESTAMP), '%Y-%m') as period,
          SUM(TRY_CAST(${pMeas} AS DOUBLE)) as total_val,
          COUNT(*) as tx_count
        FROM read_parquet('${normPath}')
        WHERE ${pDate} IS NOT NULL AND ${pMeas} IS NOT NULL
        GROUP BY period
        ORDER BY period ASC
        LIMIT 24;
      `;

      const trendRes = await queryDuckDB<{
        period: string;
        total_val: number;
        tx_count: number;
      }>(conn, trendSql);

      if (trendRes.length >= 3) {
        const last = trendRes[trendRes.length - 1];
        const prev = trendRes[trendRes.length - 2];

        if (last && prev) {
          const momGrowth = prev.total_val > 0
            ? ((last.total_val - prev.total_val) / prev.total_val) * 100
            : 0;

          if (Math.abs(momGrowth) >= 10) {
            const isUp = momGrowth > 0;
            insights.push({
              id: "trend_velocity",
              category: isUp ? "opportunity" : "risk",
              title: isUp
                ? `Strong Month-over-Month Surge (+${momGrowth.toFixed(1)}%) in ${last.period}`
                : `Notable Month-over-Month Contraction (${momGrowth.toFixed(1)}%) in ${last.period}`,
              description: `${primaryMeasure.replace(/_/g, " ")} moved from ${formatKpiValue(prev.total_val, "number")} in ${prev.period} to ${formatKpiValue(last.total_val, "number")} in ${last.period} (${momGrowth >= 0 ? "+" : ""}${momGrowth.toFixed(1)}%).`,
              impact: Math.abs(momGrowth) > 25 ? "high" : "medium",
              metric: primaryMeasure,
              confidence: 0.92,
              recommendation: isUp
                ? `Identify operational or marketing catalysts responsible for the ${last.period} surge to sustain momentum.`
                : `Investigate customer churn, inventory bottlenecks, or seasonality factors affecting recent performance.`,
            });
            keyFindings.push(
              `Recent period ${last.period} exhibited a ${momGrowth >= 0 ? "+" : ""}${momGrowth.toFixed(1)}% shift in ${primaryMeasure.replace(/_/g, " ")}.`,
            );
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 3. Statistical Anomaly Detection
  if (primaryMeasure && primaryDimension) {
    try {
      const pDim = `"${primaryDimension.replace(/"/g, '""')}"`;
      const pMeas = `"${primaryMeasure.replace(/"/g, '""')}"`;

      const anomalySql = `
        WITH stats AS (
          SELECT 
            ${pDim} as dim_val,
            AVG(TRY_CAST(${pMeas} AS DOUBLE)) as avg_val,
            COUNT(*) as item_count
          FROM read_parquet('${normPath}')
          WHERE ${pDim} IS NOT NULL AND ${pMeas} IS NOT NULL
          GROUP BY ${pDim}
          HAVING COUNT(*) >= 5
        ),
        dist AS (
          SELECT 
            AVG(avg_val) as global_mean,
            STDDEV(avg_val) as global_std
          FROM stats
        )
        SELECT 
          s.dim_val,
          s.avg_val,
          s.item_count,
          d.global_mean,
          d.global_std,
          (s.avg_val - d.global_mean) / NULLIF(d.global_std, 0) as z_score
        FROM stats s, dist d
        WHERE ABS((s.avg_val - d.global_mean) / NULLIF(d.global_std, 0)) >= 2.0
        ORDER BY ABS(z_score) DESC
        LIMIT 3;
      `;

      const anomalyRes = await queryDuckDB<{
        dim_val: string;
        avg_val: number;
        item_count: number;
        global_mean: number;
        global_std: number;
        z_score: number;
      }>(conn, anomalySql);

      for (const anom of anomalyRes) {
        insights.push({
          id: `anomaly_${anom.dim_val}`,
          category: "anomaly",
          title: `Statistical Outlier Detected in "${anom.dim_val}"`,
          description: `Segment "${anom.dim_val}" has an average ${primaryMeasure.replace(/_/g, " ")} of ${formatKpiValue(anom.avg_val, "number")}, which deviates ${Math.abs(anom.z_score).toFixed(1)} standard deviations from the dataset mean (${formatKpiValue(anom.global_mean, "number")}).`,
          impact: "medium",
          metric: primaryMeasure,
          dimension: primaryDimension,
          confidence: 0.88,
          recommendation: `Conduct a detailed drill-down into "${anom.dim_val}" transaction line items to verify unit economics.`,
        });
        keyFindings.push(`Segment "${anom.dim_val}" deviates significantly (${Math.abs(anom.z_score).toFixed(1)}σ) from normal distribution.`);
      }
    } catch {
      // ignore
    }
  }

  // 4. Data Quality & Completeness
  const dataQualityIssues: string[] = [];
  for (const col of profile.columns) {
    if (col.nullPercentage > 15) {
      dataQualityIssues.push(`Column "${col.name}" has ${col.nullPercentage}% missing values (${col.nullCount.toLocaleString()} nulls).`);
    }
  }

  if (keyFindings.length === 0) {
    keyFindings.push(`Analyzed ${profile.rowCount.toLocaleString()} records across ${profile.columnCount} dimensions and measures.`);
    keyFindings.push(`Identified ${profile.measures.length} key numerical measures and ${profile.dimensions.length} analytical dimensions.`);
  }

  const executiveSummary = `This dataset contains ${profile.rowCount.toLocaleString()} business transactions evaluated across ${profile.columnCount} attributes. Overall data completeness is ${profile.qualityScore}%. ${
    insights.length > 0
      ? `Analysis identified ${insights.length} critical actionable signals including ${insights.filter((i) => i.category === "opportunity" || i.category === "driver").length} growth drivers and ${insights.filter((i) => i.category === "risk" || i.category === "anomaly").length} operational risk/anomaly flags.`
      : "Metrics demonstrate balanced distribution across core operational segments."
  }`;

  return {
    executiveSummary,
    keyFindings,
    insights,
    dataQualitySummary: {
      totalRows: profile.rowCount,
      completenessPercentage: profile.qualityScore,
      issuesFound: dataQualityIssues,
    },
  };
}
