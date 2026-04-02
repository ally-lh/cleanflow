import type { AnalyticsSnapshot, DispatchDriver } from "../../types";
import type { SimClock, SimOrder } from "../../lib/simTypes";

interface Props {
  snapshot: AnalyticsSnapshot | null;
  drivers: DispatchDriver[];
  lastUpdated: string | null;
  dispatchError: string | null;
  snapshotError: string | null;
  onRefresh: () => void;
  simClock: SimClock | null;
  simOrders: SimOrder[];
  onToggleSpeed: () => void;
}

function Pill({ label, value, color = "text-white" }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-1.5">
      <span className="text-[10px] uppercase tracking-wider text-gray-400">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}

export default function HudBar({
  snapshot, drivers, lastUpdated, dispatchError, snapshotError,
  onRefresh, simClock, simOrders, onToggleSpeed,
}: Props) {
  const isSimMode = simClock != null;

  if (isSimMode) {
    const collections = simOrders.filter((o) => o.type === "collection");
    const deliveryOrders = simOrders.filter((o) => o.type === "delivery");
    const collected = collections.filter((o) => o.status === "COMPLETED" || o.status === "PROCESSING").length;
    const delivered = deliveryOrders.filter((o) => o.status === "COMPLETED").length;
    const lateCount = simOrders.filter((o) => o.isLate).length;
    const totalDone = collected + delivered;
    const onTime = totalDone > 0 ? (((totalDone - lateCount) / totalDone) * 100) : 100;
    const activeTrucks = drivers.length;
    const busyTrucks = drivers.filter((_, i) => {
      // Count trucks not at depot
      const d = drivers[i];
      return Math.abs(d.lat - 1.3048) > 0.001 || Math.abs(d.lng - 103.8318) > 0.001;
    }).length;

    return (
      <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none">
        <div className="pointer-events-auto mx-auto mt-3 w-fit flex items-center gap-1 bg-gray-900/85 backdrop-blur-md rounded-xl border border-gray-700/50 px-2 shadow-2xl">
          <div className="flex items-center gap-1.5 px-2 border-r border-gray-700/50">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm font-bold text-white font-mono">{simClock.simTimeLabel}</span>
          </div>

          <Pill label="Trucks" value={`${busyTrucks}/${activeTrucks}`} color="text-green-400" />
          <div className="w-px h-6 bg-gray-700/50" />
          <Pill label="Collected" value={`${collected}/${collections.length}`} color="text-amber-400" />
          <div className="w-px h-6 bg-gray-700/50" />
          <Pill label="Delivered" value={`${delivered}/${deliveryOrders.length}`} color="text-cyan-400" />
          <div className="w-px h-6 bg-gray-700/50" />
          <Pill
            label="On-Time"
            value={`${onTime.toFixed(0)}%`}
            color={onTime >= 90 ? "text-green-400" : onTime >= 70 ? "text-amber-400" : "text-red-400"}
          />
          {lateCount > 0 && (
            <>
              <div className="w-px h-6 bg-gray-700/50" />
              <Pill label="Late" value={lateCount.toString()} color="text-red-400" />
            </>
          )}
          <div className="w-px h-6 bg-gray-700/50" />
          <button
            onClick={onToggleSpeed}
            className="px-2 py-1 text-[10px] text-gray-400 hover:text-white transition-colors"
          >
            {simClock.speed === "fast" ? "5min" : "Real-time"}
          </button>
          <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden mx-1">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all"
              style={{ width: `${simClock.dayProgress * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Live mode
  const kpis = snapshot?.charts?.kpis;
  const formatCurrency = (v?: number) =>
    v != null ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—";
  const timeAgo = lastUpdated
    ? `${Math.round((Date.now() - new Date(lastUpdated).getTime()) / 1000)}s ago`
    : "—";

  return (
    <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none">
      <div className="pointer-events-auto mx-auto mt-3 w-fit flex items-center gap-1 bg-gray-900/85 backdrop-blur-md rounded-xl border border-gray-700/50 px-2 shadow-2xl">
        <div className="flex items-center gap-1.5 px-2 border-r border-gray-700/50">
          <div className={`w-2 h-2 rounded-full ${dispatchError ? "bg-red-500" : "bg-green-500 animate-pulse"}`} />
          <span className="text-[10px] text-gray-400">{timeAgo}</span>
        </div>
        <Pill label="Trucks" value={`${drivers.filter((d) => d.isLive).length}/${drivers.length}`} color="text-green-400" />
        <div className="w-px h-6 bg-gray-700/50" />
        <Pill label="Orders (7d)" value={kpis?.totalOrders?.toString() ?? "—"} />
        <div className="w-px h-6 bg-gray-700/50" />
        <Pill label="Revenue (7d)" value={formatCurrency(kpis?.totalRevenue)} />
        <div className="w-px h-6 bg-gray-700/50" />
        <button onClick={onRefresh} className="px-2 py-1 text-[10px] text-gray-400 hover:text-white transition-colors">Refresh</button>
        {(dispatchError || snapshotError) && (
          <>
            <div className="w-px h-6 bg-gray-700/50" />
            <div className="px-2 text-[10px] text-red-400 max-w-32 truncate">{dispatchError ?? snapshotError}</div>
          </>
        )}
      </div>
    </div>
  );
}
