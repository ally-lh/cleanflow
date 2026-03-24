"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import {
  buildDistrictHeatData,
  buildDriverRouteProfiles,
  buildExpansionScatter,
  buildPieData,
  buildRevenueBars,
  buildRouteKpis,
} from "./transform";
import type { AnalyticsSnapshot } from "./types";

const ClusterDensityMap = dynamic(() => import("./ClusterDensityMap"), { ssr: false });

const PIE_COLORS = ["#2563eb", "#14b8a6", "#f97316", "#8b5cf6", "#e11d48"];

interface Props {
  snapshot: AnalyticsSnapshot;
}

export default function AnalyticsDashboardClient({ snapshot }: Props) {
  const routeKpi = buildRouteKpis(snapshot);
  const districtHeat = buildDistrictHeatData(snapshot);
  const revenueBars = buildRevenueBars(snapshot.business);
  const pickupPie = buildPieData(snapshot.business?.pickupMethodCounts);
  const collectionPie = buildPieData(snapshot.business?.collectionMethodCounts);
  const expansion = buildExpansionScatter(snapshot.expansion);
  const turnaround = snapshot.business?.turnaroundHours;
  const expansionRows = snapshot.expansion?.districts ?? [];
  const driverProfiles = buildDriverRouteProfiles(routeKpi);
  const [selectedDriverId, setSelectedDriverId] = useState(driverProfiles[0]?.id ?? "driver-1");
  const selectedDriver =
    driverProfiles.find((profile) => profile.id === selectedDriverId) ?? driverProfiles[0];

  return (
    <div className="space-y-8">
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Driver route optimization</h2>
          <p className="text-sm text-gray-500">Switch profile to see per-driver optimization KPI dynamics</p>
        </div>
        <div className="w-full md:w-72">
          <label className="block text-xs font-medium text-gray-600 mb-1">Driver profile</label>
          <select
            value={selectedDriverId}
            onChange={(event) => setSelectedDriverId(event.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            {driverProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Baseline route"
          value={`${(selectedDriver?.baselineKm ?? 0).toFixed(2)} km`}
          subtitle={`${selectedDriver?.tag ?? "Driver profile"}`}
        />
        <MetricCard
          title="Optimized route"
          value={`${(selectedDriver?.optimizedKm ?? 0).toFixed(2)} km`}
          subtitle={routeKpi.twoOptApplied ? "Nearest-neighbor + 2-opt" : "Nearest-neighbor heuristic"}
        />
        <MetricCard
          title="Distance savings"
          value={`${(selectedDriver?.savingsKm ?? 0).toFixed(2)} km`}
          subtitle={`${selectedDriver?.nStops ?? 0} assigned stops`}
        />
        <MetricCard
          title="Savings rate"
          value={`${(selectedDriver?.savingsPercent ?? 0).toFixed(2)}%`}
          subtitle={`Road factor ${routeKpi.roadFactor.toFixed(2)}`}
        />
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
            <CardDescription>Matrix-style heat view inspired by operational admission heatmaps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {districtHeat.map((item) => (
              <div key={item.district} className="grid grid-cols-[42px_auto_32px] items-center gap-2">
                <div className="text-[10px] font-semibold text-slate-700">{item.district}</div>
                <div
                  className="grid gap-0.5"
                  style={{ gridTemplateColumns: "repeat(24, 8px)" }}
                >
                  {Array.from({ length: 24 }).map((_, idx) => {
                    // Tiny variation per cell to create a proper heatmap texture
                    const variation = 0.84 + ((idx % 6) * 0.03);
                    const alpha = Math.max(0.08, Math.min(0.96, item.intensity * variation));
                    return (
                      <div
                        key={`${item.district}-${idx}`}
                        className="h-2 w-2 rounded-[1px] ring-1 ring-cyan-900/5"
                        style={{ backgroundColor: `rgba(8, 120, 153, ${alpha})` }}
                        title={`District ${item.district} · ${item.count} orders`}
                      />
                    );
                  })}
                </div>
                <div className="text-right text-[10px] text-slate-700 font-medium">{item.count}</div>
              </div>
            ))}
            <div className="pt-1 text-[11px] text-gray-500">
              Darker squares indicate higher order concentration.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expansion opportunity</CardTitle>
            <CardDescription>Districts with high demand and far distance from depot are highlighted</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid />
                <XAxis type="number" dataKey="distanceKm" name="Distance (km)" unit="km" />
                <YAxis type="number" dataKey="orderCount" name="Order count" />
                <ReferenceLine x={expansion.medianX} stroke="#6b7280" strokeDasharray="4 4" />
                <ReferenceLine y={expansion.medianY} stroke="#6b7280" strokeDasharray="4 4" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value: unknown) =>
                    typeof value === "number" ? value.toFixed(2) : String(value ?? "")
                  }
                />
                <Scatter data={expansion.points}>
                  {expansion.points.map((point) => (
                    <Cell key={point.district} fill={point.candidate ? "#ef4444" : "#2563eb"} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Expansion candidate ranking</CardTitle>
            <CardDescription>Sorted by order count, with mean distance from depot</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>District</TableHead>
                  <TableHead>Order count</TableHead>
                  <TableHead>Mean distance (km)</TableHead>
                  <TableHead>Signal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expansionRows.map((row) => {
                  const candidate = expansion.points.find((point) => point.district === row.district)?.candidate;
                  return (
                    <TableRow key={row.district}>
                      <TableCell className="font-medium">{row.district}</TableCell>
                      <TableCell>{row.orderCount}</TableCell>
                      <TableCell>{row.meanDistanceFromDepotKm.toFixed(2)}</TableCell>
                      <TableCell className={candidate ? "text-red-600 font-medium" : "text-gray-500"}>
                        {candidate ? "Candidate" : "Monitor"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
              <BarChart data={revenueBars} margin={{ left: 12, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="serviceType" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalRevenue" name="Revenue" fill="#14b8a6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order collection split</CardTitle>
            <CardDescription>Pickup and collection channel breakdown</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PiePanel title="Pickup method" data={pickupPie} />
            <PiePanel title="Collection method" data={collectionPie} />
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Order turnaround time</CardTitle>
            <CardDescription>From created timestamp to completed timestamp</CardDescription>
          </CardHeader>
          <CardContent>
            {turnaround?.ok ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard title="Median" value={`${(turnaround.median ?? 0).toFixed(1)} h`} />
                <MetricCard title="Mean" value={`${(turnaround.mean ?? 0).toFixed(1)} h`} />
                <MetricCard title="P90" value={`${(turnaround.p90 ?? 0).toFixed(1)} h`} />
                <MetricCard title="Samples" value={`${turnaround.sampleSize ?? 0}`} />
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                Turnaround is unavailable for now: <strong>{turnaround?.reason ?? "insufficient data"}</strong>.{" "}
                Complete more orders with both <code>createdAt</code> and <code>completedAt</code> to populate this chart.
              </div>
            )}
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
