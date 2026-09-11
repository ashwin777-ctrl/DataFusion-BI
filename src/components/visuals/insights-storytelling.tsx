"use client";

import { useState } from "react";
import { 
  TrendingUp, 
  ArrowUpRight
} from "lucide-react";

interface InsightStory {
  type: "anomaly" | "trend" | "forecast" | "recommendation";
  title: string;
  metric: string;
  impact: string;
  confidence: string;
  narrative: string;
  action: string;
}

const INSIGHTS: InsightStory[] = [
  {
    type: "anomaly",
    title: "Unusual Conversion Velocity Spike",
    metric: "+38.4% Surge",
    impact: "+$42,800 Net ARR",
    confidence: "99.4% Statistical Significance",
    narrative: "Anomalous purchasing velocity observed on Sept 08 across European Enterprise tier. Z-score deviation exceeds 3.4 standard deviations from the 30-day moving average.",
    action: "Attribute to EU Tech Summit outbound campaign"
  },
  {
    type: "forecast",
    title: "Q4 Run-Rate Projection",
    metric: "$2.84M Predicted",
    impact: "114% of Quota",
    confidence: "95% Confidence Interval ($2.71M – $2.98M)",
    narrative: "Bayesian time-series projection indicates compounding expansion from existing annual contracts with 92% retention probability.",
    action: "Prepare infrastructure for 1.8x ingestion load"
  },
  {
    type: "recommendation",
    title: "Columnar Index Optimization",
    metric: "4.2x Faster Queries",
    impact: "68% Compute Cost Reduction",
    confidence: "Deterministic Simulation",
    narrative: "DuckDB partition scanner detected recurring full-table scans on `customer_events.region_code`. Generating a z-order clustering key will eliminate 78% of row fetches.",
    action: "Apply Recommended Partition Strategy"
  }
];

export function InsightsStorytelling() {
  const [activeTab, setActiveTab] = useState<number>(0);
  const current = INSIGHTS[activeTab] ?? INSIGHTS[0]!;

  return (
    <div className="w-full rounded-[24px] bg-white dark:bg-[#101012] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden">
      {/* Header Bar */}
      <div className="px-6 sm:px-8 py-5 border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FBFBFD] dark:bg-[#151518]">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#AF52DE]/10 text-[#AF52DE]">
              <TrendingUp className="h-3 w-3" />
              Automated Statistical Intelligence
            </span>
            <span className="text-xs text-[#86868B]">Bayesian Engine & Anomaly Classifier</span>
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] mt-1">
            Predictive Forecast & Root-Cause Attribution
          </h3>
        </div>

        {/* Story Selector Pills */}
        <div className="flex items-center gap-1 bg-[#E5E5EA]/60 dark:bg-[#2C2C2E]/60 p-1 rounded-full text-xs overflow-x-auto">
          {INSIGHTS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`px-3 py-1 rounded-full font-medium transition-all whitespace-nowrap ${
                activeTab === idx
                  ? "bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm"
                  : "text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]"
              }`}
            >
              {item.type === "anomaly" ? "Anomaly Detection" : item.type === "forecast" ? "Bayesian Forecast" : "System Advisory"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Visual Graph: Time Series with Anomaly Marker and Forecast Cone */}
        <div className="p-6 rounded-[20px] bg-[#FBFBFD] dark:bg-[#151518] border border-[#E5E5EA] dark:border-[#2C2C2E]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <span className="text-xs font-mono text-[#86868B]">METRIC STREAM</span>
              <div className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Daily Ingestion Velocity (Rows/Sec) & 30-Day Forward Forecast
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#0071E3] dark:text-[#0A84FF]" />
                <span className="text-[#86868B]">Observed History</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#AF52DE]" />
                <span className="text-[#86868B]">Forecast Mean</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-4 bg-[#AF52DE]/20 rounded-sm" />
                <span className="text-[#86868B]">95% CI Range</span>
              </div>
            </div>
          </div>

          {/* SVG Analytical Chart with Confidence Band */}
          <div className="w-full h-56 sm:h-64 relative">
            <svg viewBox="0 0 800 240" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#AF52DE" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#AF52DE" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="historyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0071E3" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0071E3" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines */}
              <line x1="0" y1="40" x2="800" y2="40" stroke="#86868B" strokeOpacity="0.15" strokeDasharray="3 3" />
              <line x1="0" y1="100" x2="800" y2="100" stroke="#86868B" strokeOpacity="0.15" strokeDasharray="3 3" />
              <line x1="0" y1="160" x2="800" y2="160" stroke="#86868B" strokeOpacity="0.15" strokeDasharray="3 3" />
              <line x1="0" y1="210" x2="800" y2="210" stroke="#86868B" strokeOpacity="0.2" />

              {/* Forecast Confidence Fan (Polygon) from x=450 to 800 */}
              <polygon
                points="450,110 520,80 600,60 680,45 800,30 800,160 680,140 600,130 520,125 450,110"
                fill="url(#forecastBand)"
              />

              {/* Historical Area Fill */}
              <polygon
                points="30,210 30,170 90,160 160,140 230,155 300,90 370,125 450,110 450,210"
                fill="url(#historyGradient)"
              />

              {/* Historical Trajectory Line */}
              <path
                d="M 30,170 Q 60,165 90,160 T 160,140 T 230,155 T 300,90 T 370,125 T 450,110"
                fill="none"
                stroke="#0071E3"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Forecast Dotted Trajectory Line */}
              <path
                d="M 450,110 Q 520,100 600,90 T 680,75 T 800,60"
                fill="none"
                stroke="#AF52DE"
                strokeWidth="2.5"
                strokeDasharray="4 4"
              />

              {/* Current Day Divider Line */}
              <line x1="450" y1="20" x2="450" y2="210" stroke="#86868B" strokeWidth="1" strokeDasharray="2 2" />
              <text x="455" y="32" fill="#86868B" fontSize="10" fontFamily="monospace">Today (T+0)</text>

              {/* Anomaly Spike Marker at x=300, y=90 */}
              <circle cx="300" cy="90" r="5" fill="#FF3B30" />
              <circle cx="300" cy="90" r="10" fill="#FF3B30" fillOpacity="0.25" className="animate-ping" />
              
              {/* Anomaly Callout Card */}
              <g transform="translate(230, 40)">
                <rect width="140" height="34" rx="8" fill="#1D1D1F" fillOpacity="0.95" />
                <text x="10" y="16" fill="#FF453A" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                  ⚠ ANOMALY: +38.4%
                </text>
                <text x="10" y="27" fill="#AEAEB2" fontSize="9" fontFamily="sans-serif">
                  p &lt; 0.001 (EU Enterprise)
                </text>
              </g>

              {/* Data points along curve */}
              {[
                { cx: 90, cy: 160 },
                { cx: 160, cy: 140 },
                { cx: 230, cy: 155 },
                { cx: 370, cy: 125 },
                { cx: 450, cy: 110 },
                { cx: 600, cy: 90 },
                { cx: 800, cy: 60 }
              ].map((pt, i) => (
                <circle key={i} cx={pt.cx} cy={pt.cy} r="3" fill="#1D1D1F" className="dark:fill-white" />
              ))}
            </svg>
          </div>

          <div className="flex justify-between items-center text-[11px] font-mono text-[#86868B] pt-2 px-1">
            <span>Aug 15 (T-30d)</span>
            <span>Aug 25</span>
            <span>Sept 08 (Spike)</span>
            <span className="font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">Sept 11 (Today)</span>
            <span>Sept 25</span>
            <span>Oct 11 (Forecast)</span>
          </div>
        </div>

        {/* Narrative Card for Active Story */}
        <div className="p-6 rounded-[20px] bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#AF52DE]">INSIGHT ANALYSIS</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#AF52DE]/10 text-[#AF52DE] font-semibold">
                {current.confidence}
              </span>
            </div>
            <h4 className="text-base sm:text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              {current.title}
            </h4>
            <p className="text-xs sm:text-sm text-[#86868B] max-w-2xl leading-relaxed">
              {current.narrative}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <div className="p-3.5 rounded-[14px] bg-[#F5F5F7] dark:bg-[#101012] border border-[#E5E5EA] dark:border-[#2C2C2E] text-center min-w-[140px]">
              <div className="text-[11px] text-[#86868B]">Calculated Impact</div>
              <div className="text-sm font-bold text-[#34C759] mt-0.5">{current.impact}</div>
            </div>
            <button className="px-4 py-3 rounded-[14px] bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm">
              <span>{current.action}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
