import type { SimTruckRuntime, SimOrder } from "../../lib/simTypes";

interface Props {
  trucks: SimTruckRuntime[];
  orders: SimOrder[];
  onSelectTruck: (truckId: string) => void;
}

const STATE_ICON: Record<string, string> = {
  AT_DEPOT:  "⬤",
  EN_ROUTE:  "▶",
  AT_STOP:   "◼",
  RETURNING: "◀",
};

const STATE_COLOR: Record<string, string> = {
  AT_DEPOT:  "text-blue-400",
  EN_ROUTE:  "text-green-400",
  AT_STOP:   "text-amber-400",
  RETURNING: "text-cyan-400",
};

function truckSummary(truck: SimTruckRuntime, _orders: SimOrder[]): string {
  const run = truck.runs[truck.currentRunIndex];
  if (!run || run.completed) {
    if (truck.currentRunIndex >= truck.runs.length) return "Done for the day";
    return "Waiting at depot";
  }

  const typeLabel = run.type === "collection" ? "Collecting" : "Delivering";

  if (truck.state === "AT_DEPOT") {
    return `Loading for ${run.type}`;
  }

  if (truck.state === "RETURNING") {
    return "Returning to depot";
  }

  const stopIdx = truck.currentStopIndex;
  const totalStops = run.stops.length;
  const currentStop = run.stops[stopIdx];

  if (truck.state === "AT_STOP") {
    const action = run.type === "collection" ? "Picking up at" : "Dropping off at";
    return `${action} ${currentStop}`;
  }

  // EN_ROUTE
  return `${typeLabel} → ${currentStop} (${stopIdx + 1}/${totalStops})`;
}

function progressDots(truck: SimTruckRuntime): { completed: number; total: number } {
  const run = truck.runs[truck.currentRunIndex];
  if (!run) return { completed: 0, total: 0 };
  const completed = Math.min(
    truck.state === "AT_DEPOT" ? 0 : truck.currentStopIndex + (truck.state === "AT_STOP" || truck.state === "RETURNING" ? 1 : 0),
    run.stops.length,
  );
  return { completed, total: run.stops.length };
}

export default function FleetPanel({ trucks, orders, onSelectTruck }: Props) {
  return (
    <div className="absolute bottom-4 right-4 z-[1000] pointer-events-auto">
      <div className="bg-gray-900/85 backdrop-blur-md rounded-xl border border-gray-700/50 shadow-2xl w-72 max-h-80 overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-gray-700/50">
          <span className="text-[10px] uppercase tracking-wider text-gray-400">Fleet Activity</span>
        </div>
        <div className="overflow-y-auto flex-1">
          {trucks.map((truck) => {
            const run = truck.runs[truck.currentRunIndex];
            const summary = truckSummary(truck, orders);
            const { completed, total } = progressDots(truck);
            const stateColor = STATE_COLOR[truck.state] ?? "text-gray-400";
            const icon = STATE_ICON[truck.state] ?? "⬤";
            const runType = run && !run.completed ? run.type : null;

            return (
              <button
                key={truck.truckId}
                onClick={() => onSelectTruck(truck.truckId)}
                className="w-full px-3 py-2 flex items-start gap-2 hover:bg-gray-800/50 transition-colors text-left border-b border-gray-800/30 last:border-b-0"
              >
                {/* Status icon */}
                <span className={`text-[8px] mt-1 ${stateColor}`}>{icon}</span>

                <div className="flex-1 min-w-0">
                  {/* Name + run type badge */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-white truncate">
                      {truck.driverName.split(" (")[0]}
                    </span>
                    {runType && (
                      <span className={`text-[9px] px-1 py-0 rounded ${
                        runType === "collection"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-cyan-500/15 text-cyan-400"
                      }`}>
                        {runType === "collection" ? "COL" : "DEL"}
                      </span>
                    )}
                  </div>

                  {/* Summary text */}
                  <div className="text-[10px] text-gray-400 truncate mt-0.5">
                    {summary}
                  </div>

                  {/* Progress bar */}
                  {total > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {Array.from({ length: total }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full ${
                            i < completed ? "bg-green-500" : "bg-gray-700"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="text-[9px] text-gray-500 text-right whitespace-nowrap mt-0.5">
                  {truck.collectionsToday + truck.deliveriesToday > 0 && (
                    <span>{truck.collectionsToday + truck.deliveriesToday} done</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
