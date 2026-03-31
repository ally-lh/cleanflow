import type { DispatchDriver, DispatchDelivery } from "../../types";
import type { SimTruckRuntime, SimOrder } from "../../lib/simTypes";

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  AT_DEPOT:  { label: "At depot",           color: "text-blue-400" },
  EN_ROUTE:  { label: "En route",           color: "text-green-400" },
  AT_STOP:   { label: "At customer",        color: "text-amber-400" },
  RETURNING: { label: "Returning to depot",  color: "text-cyan-400" },
};

interface Props {
  driver: DispatchDriver;
  deliveries: DispatchDelivery[];
  simTruck?: SimTruckRuntime;
  simOrders?: SimOrder[];
  onClose: () => void;
}

export default function TruckDetailPanel({ driver, deliveries, simTruck, simOrders, onClose }: Props) {
  const isSim = !!simTruck;
  const stateInfo = simTruck ? STATE_LABELS[simTruck.state] : null;
  const currentRun = simTruck?.runs[simTruck.currentRunIndex];

  // Get orders for the current run
  const runOrders = currentRun && simOrders
    ? currentRun.orderIds.map((id) => simOrders.find((o) => o.id === id)).filter(Boolean) as SimOrder[]
    : [];

  const status = isSim && stateInfo ? stateInfo.label : deliveries.length > 0 ? "Delivering" : "Idle";
  const statusColor = isSim && stateInfo ? stateInfo.color : deliveries.length > 0 ? "text-green-400" : "text-blue-400";

  return (
    <div className="absolute top-0 right-0 bottom-0 z-[1000] pointer-events-auto w-80 bg-gray-900/90 backdrop-blur-md border-l border-gray-700/50 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div>
          <h3 className="text-sm font-semibold text-white">{driver.driverName}</h3>
          <span className={`text-xs ${statusColor}`}>{status}</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none px-1">x</button>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {/* Sim stats */}
        {isSim && simTruck && (
          <Section label="Today's Stats">
            <div className="flex gap-3">
              <MiniStat label="Collected" value={simTruck.collectionsToday.toString()} />
              <MiniStat label="Delivered" value={simTruck.deliveriesToday.toString()} />
              <MiniStat label="Runs" value={`${simTruck.currentRunIndex + (currentRun?.completed ? 1 : 0)}/${simTruck.runs.length}`} />
            </div>
          </Section>
        )}

        {/* Current run */}
        {currentRun && !currentRun.completed && (
          <Section label={`${currentRun.type === "collection" ? "Collection" : "Delivery"} Run`}>
            <div className="space-y-1">
              {runOrders.map((order, i) => {
                const isDone = order.status === "COMPLETED" || order.status === "PROCESSING";
                const isCurrent = i === simTruck!.currentStopIndex && simTruck!.state !== "AT_DEPOT";
                return (
                  <div
                    key={order.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
                      isCurrent ? "bg-gray-800 text-white" : isDone ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    <span className={`w-4 text-center ${isDone ? "text-green-400" : isCurrent ? "text-amber-400" : ""}`}>
                      {isDone ? "✓" : isCurrent ? "→" : `${i + 1}`}
                    </span>
                    <span className={isDone ? "line-through" : ""}>{order.waypoint}</span>
                    <span className="ml-auto text-[10px] text-gray-600">{order.orderNumber}</span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Upcoming runs */}
        {isSim && simTruck && simTruck.currentRunIndex < simTruck.runs.length - 1 && (
          <Section label="Next Run">
            {(() => {
              const nextRun = simTruck.runs[simTruck.currentRunIndex + 1];
              if (!nextRun || nextRun.completed) return null;
              return (
                <div className="bg-gray-800/40 rounded-lg px-2.5 py-1.5 text-xs text-gray-400">
                  {nextRun.type === "collection" ? "Collection" : "Delivery"} — {nextRun.stops.length} stops
                </div>
              );
            })()}
          </Section>
        )}

        {/* Live mode deliveries */}
        {!isSim && deliveries.length > 0 && (
          <Section label={`Active Deliveries (${deliveries.length})`}>
            <div className="space-y-2">
              {deliveries.map((d) => (
                <div key={d.orderId} className="bg-gray-800/60 rounded-lg p-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-white">{d.orderNumber}</span>
                    <span className="text-[10px] text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">{d.status}</span>
                  </div>
                  {d.dropoffAddress && <p className="text-[11px] text-gray-400 mt-1">{d.dropoffAddress}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section label="Location">
          <p className="text-xs text-gray-300">{driver.lat.toFixed(4)}, {driver.lng.toFixed(4)}</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800/50 rounded px-2 py-1 text-center flex-1">
      <div className="text-[9px] text-gray-500">{label}</div>
      <div className="text-xs font-semibold text-white">{value}</div>
    </div>
  );
}
