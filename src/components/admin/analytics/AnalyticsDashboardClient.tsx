"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPostalSectorLabel, formatPostalSectorName } from "@/lib/geo/sgPostalSectors";
import {
  buildDistrictHeatData,
  buildExpansionScatter,
  buildPieData,
  buildRevenueMixCharts,
  buildOperationalDrivers,
  buildTopKpis,
  buildDemandTopDistricts,
  buildTimeSeries,
} from "./transform";
import type { AnalyticsSnapshot } from "./types";

const ClusterDensityMap = dynamic(() => import("./ClusterDensityMap"), { ssr: false });

const PIE_COLORS = ["#2563eb", "#14b8a6", "#f97316", "#8b5cf6", "#e11d48"];

interface Props {
  snapshot: AnalyticsSnapshot;
}

export default function AnalyticsDashboardClient({ snapshot }: Props) {
  const kpis = buildTopKpis(snapshot);
  const districtHeat = buildDistrictHeatData(snapshot).map((row) => ({
    ...row,
    districtName: formatPostalSectorName(row.district),
    districtLabel: formatPostalSectorLabel(row.district),
  }));
  const pickupPie = buildPieData(snapshot.business?.pickupMethodCounts);
  const collectionPie = buildPieData(snapshot.business?.collectionMethodCounts);
  // Keep scatter derivation available for future use; current UI uses ranked Top 10.
  const expansionRaw = buildExpansionScatter(snapshot.expansion);
  const expansion = {
    ...expansionRaw,
    points: expansionRaw.points.map((p) => ({
      ...p,
      districtName: formatPostalSectorName(p.district),
      districtLabel: formatPostalSectorLabel(p.district),
    })),
  };
  const expansionRows = (snapshot.expansion?.districts ?? []).map((row) => ({
    ...row,
    districtName: formatPostalSectorName(row.district),
    districtLabel: formatPostalSectorLabel(row.district),
  }));
  const operationalDrivers = buildOperationalDrivers(snapshot);
  const revenueMix = buildRevenueMixCharts(snapshot);
  const demandTop = buildDemandTopDistricts(snapshot).map((row) => ({
    ...row,
    districtName: formatPostalSectorName(row.district),
    districtLabel: formatPostalSectorLabel(row.district),
  }));
  const timeDaily = buildTimeSeries(snapshot);

  const [selectedDriverId, setSelectedDriverId] = useState<string>(operationalDrivers[0]?.driverId ?? "");
  const selectedDriver =
    operationalDrivers.find((d) => d.driverId === selectedDriverId) ?? operationalDrivers[0];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard title="Total orders" value={`${kpis.totalOrders}`} />
        <MetricCard title="Total revenue" value={`$${kpis.totalRevenue.toFixed(2)}`} />
        <MetricCard title="Avg order value" value={`$${kpis.avgOrderValue.toFixed(2)}`} />
        <MetricCard title="Total distance saved" value={`${kpis.totalDistanceSavedKm.toFixed(2)} km`} />
        <MetricCard title="Avg savings rate" value={`${kpis.avgSavingsRatePercent.toFixed(2)}%`} />
      </section>

      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Operational efficiency</h2>
          <p className="text-sm text-gray-500">Baseline vs optimised distance per driver, and workload imbalance</p>
        </div>
        <div className="w-full md:w-80">
          <label className="block text-xs font-medium text-gray-600 mb-1">Driver</label>
          <select
            value={selectedDriverId}
            onChange={(event) => setSelectedDriverId(event.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!operationalDrivers.length}
          >
            {operationalDrivers.map((d) => (
              <option key={d.driverId} value={d.driverId}>
                {d.driverLabel ?? d.driverId}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Baseline (selected)" value={`${(selectedDriver?.baselineKm ?? 0).toFixed(2)} km`} subtitle={`${selectedDriver?.stops ?? 0} stops`} />
        <MetricCard title="Optimised (selected)" value={`${(selectedDriver?.optimizedKm ?? 0).toFixed(2)} km`} subtitle="Nearest-neighbor / 2-opt" />
        <MetricCard title="Saved (selected)" value={`${(selectedDriver?.savingsKm ?? 0).toFixed(2)} km`} subtitle={`${(selectedDriver?.savingsPercent ?? 0).toFixed(2)}%`} />
        <MetricCard
          title="Best saver"
          value={`${(operationalDrivers[0]?.savingsKm ?? 0).toFixed(2)} km`}
          subtitle={operationalDrivers[0]?.driverLabel ?? operationalDrivers[0]?.driverId ?? "—"}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Baseline vs optimised distance (per driver)</CardTitle>
            <CardDescription>Compare route lengths and see imbalance</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={operationalDrivers} margin={{ left: 12, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="driverLabel" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="baselineKm" name="Baseline (km)" fill="#93c5fd" radius={[6, 6, 0, 0]} />
                <Bar dataKey="optimizedKm" name="Optimised (km)" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distance saved (per driver)</CardTitle>
            <CardDescription>Sorted by savings to highlight the best wins</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={operationalDrivers} margin={{ left: 12, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="driverLabel" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="savingsKm" name="Saved (km)" fill="#14b8a6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Geographic customer clustering</CardTitle>
            <CardDescription>Map view with centroid bubbles and distinct colors per cluster</CardDescription>
          </CardHeader>
          <CardContent>
            <ClusterDensityMap clustering={snapshot.geo?.clustering} expansion={snapshot.expansion} />
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order density heatmap (postal prefix)</CardTitle>
            <CardDescription>Each row is a district; darker + longer bars mean more orders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {districtHeat.map((item) => (
              <div key={item.district} className="grid grid-cols-[96px_1fr_32px] items-center gap-3">
                <div
                  className="text-[11px] font-semibold text-slate-700 leading-4"
                  title={item.districtLabel}
                >
                  {item.districtName}
                </div>
                <div
                  className="grid gap-1 w-full"
                  style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
                >
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const isFilled = idx < item.filled;
                    const alpha = isFilled ? 0.9 : 0.08;
                    return (
                      <div
                        key={`${item.district}-${idx}`}
                        className="w-full aspect-square rounded-[2px] ring-1 ring-cyan-900/5"
                        style={{ backgroundColor: `rgba(8, 120, 153, ${alpha})` }}
                        title={`${item.districtLabel} · ${item.count} orders`}
                      />
                    );
                  })}
                </div>
                <div className="text-right text-[10px] text-slate-700 font-medium">{item.count}</div>
              </div>
            ))}
            <div className="pt-1 text-[11px] text-gray-500">
              Tip: use this to pick zones for promos, staffing, or micro-hubs.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ranked expansion districts</CardTitle>
            <CardDescription>Highest demand areas that are farthest from the current depot</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...expansionRows].sort((a, b) => b.meanDistanceFromDepotKm - a.meanDistanceFromDepotKm).slice(0, 10)}
                layout="vertical"
                margin={{ left: 18, right: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="districtName" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="meanDistanceFromDepotKm" name="Mean distance (km)" fill="#ef4444" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top districts by order count</CardTitle>
            <CardDescription>Sorted descending for demand concentration</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demandTop} layout="vertical" margin={{ left: 18, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  dataKey="districtName"
                  type="category"
                  width={140}
                  interval={0}
                  tickMargin={6}
                />
                <Tooltip
                  formatter={(value: unknown, _name: unknown, item: { payload?: { districtLabel?: string } }) => {
                    const num = typeof value === "number" ? value : Number(value ?? 0);
                    return [num, item?.payload?.districtLabel ?? "Orders"];
                  }}
                />
                <Bar dataKey="orders" name="Orders" fill="#0ea5e9" radius={[0, 6, 6, 0]}>
                  <LabelList dataKey="districtName" position="insideLeft" fontSize={10} fill="#0f172a" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders over time</CardTitle>
            <CardDescription>Daily order volume (from createdAt)</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeDaily} margin={{ left: 12, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" minTickGap={24} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="orders" name="Orders" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by service type</CardTitle>
            <CardDescription>Compare total revenue and average order value</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueMix.revenueBar} margin={{ left: 12, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="serviceType" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" name="Revenue" fill="#14b8a6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average order value by service</CardTitle>
            <CardDescription>Identify which services drive value vs volume</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueMix.aovBar} margin={{ left: 12, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="serviceType" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avgOrderValue" name="Avg order value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue contribution (%)</CardTitle>
            <CardDescription>Service mix by revenue share</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueMix.revenuePie} dataKey="value" nameKey="name" outerRadius={110} label>
                  {revenueMix.revenuePie.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown, name: unknown, item: { payload?: { percent?: number } }) => {
                    const num = typeof value === "number" ? value : Number(value ?? 0);
                    const pct = item?.payload?.percent ?? 0;
                    return [`$${num.toFixed(2)} (${pct.toFixed(1)}%)`, String(name ?? "")];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pickup vs collection split</CardTitle>
            <CardDescription>Usage patterns and preferences</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PiePanel title="Pickup method" data={pickupPie} />
            <PiePanel title="Collection method" data={collectionPie} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card size="sm">
      <CardHeader className="pb-0">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {subtitle ? <div className="text-xs text-gray-500">{subtitle}</div> : null}
      </CardContent>
    </Card>
  );
}

function PiePanel({
  title,
  data,
}: {
  title: string;
  data: Array<{ name: string; value: number; percent: number }>;
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-500">
        {title}: no data
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <p className="text-sm font-medium mb-2">{title}</p>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={64} innerRadius={36} label>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: unknown, name: unknown, item: { payload?: { percent?: number } }) => {
                const num = typeof value === "number" ? value : Number(value ?? 0);
                const pct = item?.payload?.percent ?? 0;
                return [`${num} (${pct.toFixed(1)}%)`, String(name ?? "")];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
