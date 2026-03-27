"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPostalSectorName } from "@/lib/geo/sgPostalSectors";
import type { AnalyticsSnapshot } from "./types";

// ─────────────────────────────────────────────────────────────
// EDIT THIS — one row per postal district you serve.
//
//   code        : 2-digit Singapore postal district prefix
//   orders      : from analytics_snapshot.json
//                 → charts.demandPatterns.topDistricts[].orders
//   dist        : from analytics_snapshot.json
//                 → expansion.districts[].meanDistanceFromDepotKm
//   risk        : "High" | "Medium" | "Low"
//   factor      : peak-hour road multiplier on top of base ×1.4
//                   AYE/CTE adjacent (central) → 1.60–1.80
//                   PIE/SLE mid-ring           → 1.40–1.55
//                   TPE/ECP outer              → 1.25–1.35
//   window      : plain-English best dispatch time
//   expressway  : main expressways used to reach district
// ─────────────────────────────────────────────────────────────
const DISTRICT_CONFIG: Array<{
  code: string;
  orders: number;
  dist: number;
  risk: "High" | "Medium" | "Low";
  factor: number;
  window: string;
  expressway: string;
}> = [
  { code: "33", orders: 60, dist: 3.884,  risk: "High",   factor: 1.72, window: "Before 8 am or after 7 pm", expressway: "AYE / CTE" },
  { code: "21", orders: 37, dist: 3.692,  risk: "High",   factor: 1.68, window: "Before 8 am or after 7 pm", expressway: "AYE / PIE" },
  { code: "38", orders: 35, dist: 4.801,  risk: "Medium", factor: 1.48, window: "9–11 am or 2–4 pm",         expressway: "CTE / SLE" },
  { code: "20", orders: 24, dist: 3.569,  risk: "High",   factor: 1.65, window: "Before 8 am or after 7 pm", expressway: "AYE"       },
  { code: "36", orders: 15, dist: 5.14,   risk: "Medium", factor: 1.45, window: "9–11 am or 2–4 pm",         expressway: "PIE"       },
  { code: "19", orders: 15, dist: 3.306,  risk: "Medium", factor: 1.42, window: "9–11 am or 3–5 pm",         expressway: "BKE / PIE" },
  { code: "52", orders: 10, dist: 13.44,  risk: "Low",    factor: 1.28, window: "Any off-peak",               expressway: "TPE / ECP" },
  { code: "35", orders: 8,  dist: 5.16,   risk: "Medium", factor: 1.44, window: "9–11 am or 2–4 pm",         expressway: "CTE"       },
  { code: "73", orders: 6,  dist: 15.56,  risk: "Low",    factor: 1.25, window: "Any off-peak",               expressway: "SLE"       },
  { code: "64", orders: 6,  dist: 14.58,  risk: "Medium", factor: 1.43, window: "9–11 am or 2–4 pm",         expressway: "ECP"       },
  { code: "65", orders: 5,  dist: 10.46,  risk: "Medium", factor: 1.40, window: "9–11 am or 2–4 pm",         expressway: "KPE / PIE" },
  { code: "12", orders: 4,  dist: 7.47,   risk: "Medium", factor: 1.46, window: "9–11 am or 2–4 pm",         expressway: "CTE"       },
  { code: "76", orders: 4,  dist: 13.87,  risk: "Low",    factor: 1.30, window: "Any off-peak",               expressway: "ECP"       },
  { code: "82", orders: 2,  dist: 13.51,  risk: "Low",    factor: 1.27, window: "Any off-peak",               expressway: "TPE"       },
  { code: "57", orders: 1,  dist: 5.44,   risk: "Medium", factor: 1.50, window: "9–11 am or 2–4 pm",         expressway: "AYE"       },
];

// ─────────────────────────────────────────────────────────────
// EDIT THIS — 18 values, one per hour from 5 am to 10 pm.
// These represent the weighted average road congestion index.
// Update with LTA live data or your own delivery observations.
// ─────────────────────────────────────────────────────────────
const HOURS = ["5am","6am","7am","8am","9am","10am","11am","12pm","1pm","2pm","3pm","4pm","5pm","6pm","7pm","8pm","9pm","10pm"];
const CONGESTION_IDX = [1.05, 1.10, 1.35, 1.80, 1.55, 1.25, 1.15, 1.30, 1.40, 1.25, 1.35, 1.55, 1.70, 1.85, 1.50, 1.20, 1.10, 1.05];

// ─────────────────────────────────────────────────────────────
// EDIT THIS — recommended dispatch windows.
// recommended: true = green badge, false = red (avoid)
// ─────────────────────────────────────────────────────────────
const WINDOWS = [
  { label: "Early morning", time: "6:00–8:00 am",  range: "×1.10–1.35", recommended: true,  note: "Best window — before ERP activation on most gantries" },
  { label: "Mid morning",   time: "9:00–11:00 am", range: "×1.15–1.25", recommended: true,  note: "Good for medium-risk districts after AM peak clears"  },
  { label: "AM peak",       time: "7:30–9:00 am",  range: "×1.55–1.85", recommended: false, note: "Avoid — ERP active, CTE/AYE heavily congested"        },
  { label: "Lunch",         time: "12:00–1:00 pm", range: "×1.30–1.40", recommended: true,  note: "Acceptable for far, low-risk districts"               },
  { label: "Afternoon",     time: "2:00–4:00 pm",  range: "×1.25–1.35", recommended: true,  note: "Second-best window for central districts"             },
  { label: "PM peak",       time: "5:30–7:30 pm",  range: "×1.70–1.85", recommended: false, note: "Avoid — worst congestion of the day"                  },
  { label: "Evening",       time: "7:30–9:00 pm",  range: "×1.10–1.20", recommended: true,  note: "Good recovery window once ERP deactivates"            },
];

// ─────────────────────────────────────────────────────────────
// Nothing below needs changing.
// ─────────────────────────────────────────────────────────────

type Tab = "overview" | "timeline" | "demand" | "windows";

const RISK_STYLES = {
  High:   { badge: "bg-red-50 text-red-800",    dot: "bg-red-500"   },
  Medium: { badge: "bg-amber-50 text-amber-800", dot: "bg-amber-400" },
  Low:    { badge: "bg-teal-50 text-teal-800",   dot: "bg-teal-500"  },
};

const HOUR_COLOR = (v: number) =>
  v >= 1.6 ? "#ef4444" : v >= 1.3 ? "#f59e0b" : "#14b8a6";

interface Props {
  snapshot: AnalyticsSnapshot;
}

export default function CongestionPanel({ snapshot }: Props) {
  const [tab, setTab] = useState<Tab>("overview");

  // Merge snapshot order counts into config (snapshot is the source of truth for orders/dist)
  const snapshotDistricts = snapshot.expansion?.districts ?? [];
  const snapshotDemand    = snapshot.charts?.demandPatterns?.topDistricts ?? [];

  const districts = DISTRICT_CONFIG.map((cfg) => {
    const snapExp  = snapshotDistricts.find((d) => d.district === cfg.code);
    const snapDem  = snapshotDemand.find((d) => d.district === cfg.code);
    return {
      ...cfg,
      orders: snapDem?.orders  ?? cfg.orders,
      dist:   snapExp?.meanDistanceFromDepotKm ?? cfg.dist,
      name:   formatPostalSectorName(cfg.code),
    };
  }).sort((a, b) => b.orders - a.orders);

  const hourData = HOURS.map((h, i) => ({ hour: h, index: CONGESTION_IDX[i] }));
  const maxOrders = Math.max(...districts.map((d) => d.orders));

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "District overview" },
    { id: "timeline", label: "Hour-by-hour" },
    { id: "demand",   label: "Demand by district" },
    { id: "windows",  label: "Dispatch windows" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Active districts"     value="15"         sub="9 with congestion data" />
        <MetricCard title="Peak-hour factor"     value="×1.8"       sub="CTE/PIE 8–9 am, 6–7 pm" />
        <MetricCard title="Best dispatch window" value="7–8 am"     sub="Lowest congestion index" />
        <MetricCard title="Distance saved"       value="109.5 km"   sub="46.5% vs baseline" />
      </section>

      {/* Tab bar */}
      <div className="border-b border-gray-200 flex gap-0">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={[
              "px-4 py-2 text-sm border-b-2 -mb-px transition-colors",
              tab === id
                ? "border-gray-900 text-gray-900 font-medium"
                : "border-transparent text-gray-500 hover:text-gray-700",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: overview ── */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Congestion by district</CardTitle>
              <CardDescription>Top 9 by order volume — peak-hour road factor</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-gray-100">
              {districts.slice(0, 9).map((d) => (
                <div key={d.code} className="flex items-center gap-3 py-2">
                  <span className="w-7 text-xs font-semibold text-gray-700">{d.code}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.expressway}</p>
                  </div>
                  <RiskBadge risk={d.risk} />
                  <span className="text-sm font-medium text-gray-800 w-10 text-right">
                    ×{d.factor.toFixed(2)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Congestion index by hour</CardTitle>
              <CardDescription>Weighted average road factor across Singapore</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourData} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={40} />
                  <YAxis domain={[0.9, 2.1]} tickFormatter={(v) => `×${v.toFixed(1)}`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: unknown) => [`×${(v as number).toFixed(2)}`, "Index"]} />
                  <Bar
                    dataKey="index"
                    radius={[3, 3, 0, 0]}
                    fill="#14b8a6"
                    isAnimationActive={false}
                  >
                    {hourData.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={HOUR_COLOR(entry.index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
            <div className="px-6 pb-4 flex gap-4 text-xs text-gray-500">
              <Legend color="#ef4444" label="High (>1.6)" />
              <Legend color="#f59e0b" label="Medium (1.3–1.6)" />
              <Legend color="#14b8a6" label="Low (<1.3)" />
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: timeline ── */}
      {tab === "timeline" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weighted road factor across the day</CardTitle>
              <CardDescription>Order-volume-weighted congestion index, 5 am – 10 pm</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourData} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={40} />
                  <YAxis domain={[0.9, 2.1]} tickFormatter={(v) => `×${v.toFixed(1)}`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: unknown) => [`×${(v as number).toFixed(2)}`, "Index"]} />
                  <Line
                    type="monotone"
                    dataKey="index"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props as { cx: number; cy: number; payload: { index: number } };
                      return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={4} fill={HOUR_COLOR(payload.index)} stroke="none" />;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expressway notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-500 leading-relaxed space-y-2">
              <p>
                Singapore ERP gantries activate on CTE, PIE, AYE, and MCE corridors during peak hours.
                Districts 33 (Queenstown/Redhill), 21 (Clementi/Jurong East), and 20 (Buona Vista)
                sit directly on AYE/CTE — expect ×1.65–1.80 during AM/PM peaks.
              </p>
              <p>
                Districts 52 (Tampines) and 73 (Yishun/Sembawang) are far from the depot but benefit
                from TPE/SLE which are less congested than central expressways, keeping their factor lower.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab: demand ── */}
      {tab === "demand" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Orders by district</CardTitle>
              <CardDescription>Bar length = order volume, colour = congestion risk</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-gray-100">
              {districts.map((d) => (
                <div key={d.code} className="flex items-center gap-3 py-2">
                  <span className="w-7 text-xs font-semibold text-gray-700">{d.code}</span>
                  <span className="text-xs text-gray-600 w-40 truncate">{d.name}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((d.orders / maxOrders) * 100)}%`,
                        background: d.risk === "High" ? "#ef4444" : d.risk === "Medium" ? "#f59e0b" : "#14b8a6",
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-6 text-right">{d.orders}</span>
                  <RiskBadge risk={d.risk} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Orders vs congestion factor</CardTitle>
              <CardDescription>Bubble size = order volume · hover for district name</CardDescription>
            </CardHeader>
            <CardContent className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: 8, right: 16, top: 16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="factor"
                    type="number"
                    domain={[1.1, 1.9]}
                    name="Peak factor"
                    tickFormatter={(v) => `×${v.toFixed(1)}`}
                    tick={{ fontSize: 11 }}
                    label={{ value: "Peak-hour factor", position: "insideBottom", offset: -4, fontSize: 11 }}
                    height={40}
                  />
                  <YAxis
                    dataKey="orders"
                    type="number"
                    name="Orders"
                    tick={{ fontSize: 11 }}
                    label={{ value: "Orders", angle: -90, position: "insideLeft", fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload as (typeof districts)[number];
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow-sm">
                          <p className="font-medium">{d.name}</p>
                          <p className="text-gray-500">{d.orders} orders · ×{d.factor.toFixed(2)}</p>
                          <p className="text-gray-400">{d.dist.toFixed(1)} km from depot</p>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={districts} fill="#2563eb">
                    {districts.map((d, i) => (
                      <Cell
                        key={`scatter-${i}`}
                        fill={d.risk === "High" ? "#ef4444" : d.risk === "Medium" ? "#f59e0b" : "#14b8a6"}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab: windows ── */}
      {tab === "windows" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recommended dispatch windows</CardTitle>
              <CardDescription>Green = recommended · Red = avoid</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-gray-100">
              {WINDOWS.map((w) => (
                <div key={w.label} className="flex items-start gap-3 py-3">
                  <div
                    className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${w.recommended ? "bg-teal-500" : "bg-red-500"}`}
                  />
                  <span className="text-xs bg-gray-100 rounded px-2 py-0.5 text-gray-500 whitespace-nowrap flex-shrink-0">
                    {w.time}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {w.label}{" "}
                      <span className="font-normal text-gray-400">{w.range}</span>
                    </p>
                    <p className="text-xs text-gray-500">{w.note}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Effective road factor by window</CardTitle>
              <CardDescription>Lower is better — aim for green bars</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={WINDOWS.map((w) => ({
                    label: w.label,
                    factor: parseFloat(w.range.replace("×", "").split("–")[0]),
                    recommended: w.recommended,
                  }))}
                  layout="vertical"
                  margin={{ left: 8, right: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    domain={[1.0, 2.0]}
                    tickFormatter={(v) => `×${v.toFixed(1)}`}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis dataKey="label" type="category" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: unknown) => [`×${(v as number).toFixed(2)}`, "Factor"]} />
                  <Bar dataKey="factor" radius={[0, 4, 4, 0]}>
                    {WINDOWS.map((w, i) => (
                      <Cell key={i} fill={w.recommended ? "#14b8a6" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Small helpers ────────────────────────────────────────────

function MetricCard({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500">{sub}</div>
      </CardContent>
    </Card>
  );
}

function RiskBadge({ risk }: { risk: "High" | "Medium" | "Low" }) {
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${RISK_STYLES[risk].badge}`}>
      {risk}
    </span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color }} />
      {label}
    </span>
  );
}
