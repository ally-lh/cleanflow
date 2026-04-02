import { useCallback, useEffect, useRef, useState } from "react";
import type { DispatchDriver, DispatchDelivery } from "../types";
import type {
  SimOrder,
  SimTruckRuntime,
  SimClock,
  SimSpeed,
  DaySummary,
} from "../lib/simTypes";
import {
  SIM_START_HOUR,
  SIM_END_HOUR,
  TICK_MS,
  FAST_HOURS_PER_TICK,
  REALTIME_HOURS_PER_TICK,
  DWELL_HOURS,
  LATE_THRESHOLD_HOURS,
} from "../lib/simTypes";
import { waypointCoord, buildRoutePath, posOnPath } from "../lib/simPathBuilder";
import { getCongestionFactor } from "../lib/simCongestion";
import { generateDayPlan, TRUCK_DEFS } from "../lib/simOrderGenerator";

// The depot is at HUB_CENTRAL. All trucks start/end here.
const DEPOT_WP = "HUB_CENTRAL";

// ── Mutable simulation world ───────────────────────────────

interface SimWorld {
  simHour: number;
  speed: SimSpeed;
  dayComplete: boolean;
  dayCount: number;
  orders: SimOrder[];
  trucks: SimTruckRuntime[];
}

function initWorld(dayNumber: number): SimWorld {
  const plan = generateDayPlan(dayNumber);
  const depotCoord = waypointCoord(DEPOT_WP);

  const trucks: SimTruckRuntime[] = TRUCK_DEFS.map((def) => {
    const truckRuns = plan.runs.filter((r) => r.truckId === def.id);
    return {
      truckId: def.id,
      driverName: `${def.name} (${def.hub})`,
      hub: def.hub,
      baseSpeedKmh: def.baseSpeedKmh,
      state: "AT_DEPOT" as const,
      lat: depotCoord.lat,
      lng: depotCoord.lng,
      currentRunIndex: 0,
      currentStopIndex: 0,
      runs: truckRuns,
      currentPath: null,
      pathProgress: 0,
      dwellUntilHour: 0,
      collectionsToday: 0,
      deliveriesToday: 0,
    };
  });

  return {
    simHour: SIM_START_HOUR,
    speed: "fast",
    dayComplete: false,
    dayCount: dayNumber,
    orders: plan.orders,
    trucks,
  };
}

// ── Tick logic ──────────────────────────────────────────────

function tickWorld(world: SimWorld): void {
  if (world.dayComplete) return;

  const hpt = world.speed === "fast" ? FAST_HOURS_PER_TICK : REALTIME_HOURS_PER_TICK;
  world.simHour += hpt;

  if (world.simHour >= SIM_END_HOUR) {
    world.simHour = SIM_END_HOUR;
    world.dayComplete = true;
    return;
  }

  for (const truck of world.trucks) {
    tickTruck(truck, world);
  }
}

function tickTruck(truck: SimTruckRuntime, world: SimWorld): void {
  const currentRun = truck.runs[truck.currentRunIndex];

  switch (truck.state) {
    case "AT_DEPOT": {
      if (!currentRun || currentRun.completed) {
        if (truck.currentRunIndex < truck.runs.length - 1) {
          truck.currentRunIndex++;
          return;
        }
        return;
      }

      if (world.simHour < currentRun.startHour) return;

      // Depart depot → first stop (via hub if needed)
      const firstStop = currentRun.stops[0];
      if (!firstStop) return;

      const firstOrderId = currentRun.orderIds[0];
      const firstOrder = world.orders.find((o) => o.id === firstOrderId);
      if (firstOrder) firstOrder.status = "IN_PROGRESS";

      truck.currentPath = buildRoutePath(DEPOT_WP, firstStop);
      truck.pathProgress = 0;
      truck.currentStopIndex = 0;
      truck.state = "EN_ROUTE";
      // Position truck at start of path (no jump)
      if (truck.currentPath && truck.currentPath.coords.length > 0) {
        truck.lat = truck.currentPath.coords[0].lat;
        truck.lng = truck.currentPath.coords[0].lng;
      }
      break;
    }

    case "EN_ROUTE": {
      if (!currentRun || !truck.currentPath) return;

      advanceTruck(truck, world);

      if (truck.pathProgress >= 1.0) {
        // Arrived — use the path's actual end coordinate (no jumping)
        const endCoord = truck.currentPath.coords[truck.currentPath.coords.length - 1];
        truck.lat = endCoord.lat;
        truck.lng = endCoord.lng;

        if (truck.state === "EN_ROUTE") {
          // We're at a customer stop
          const stopIdx = truck.currentStopIndex;
          const orderId = currentRun.orderIds[stopIdx];
          const order = world.orders.find((o) => o.id === orderId);

          if (order) {
            order.status = "COMPLETED";
            order.completedAtHour = world.simHour;
            if (world.simHour > currentRun.startHour + LATE_THRESHOLD_HOURS) {
              order.isLate = true;
            }
            if (currentRun.type === "collection") truck.collectionsToday++;
            else truck.deliveriesToday++;
          }

          truck.state = "AT_STOP";
          truck.dwellUntilHour = world.simHour + DWELL_HOURS;

          // Preview next order
          const nextIdx = stopIdx + 1;
          if (nextIdx < currentRun.stops.length) {
            const nextOrder = world.orders.find((o) => o.id === currentRun.orderIds[nextIdx]);
            if (nextOrder) nextOrder.status = "IN_PROGRESS";
          }
        }
      }
      break;
    }

    case "AT_STOP": {
      if (world.simHour < truck.dwellUntilHour) return;
      if (!currentRun) return;

      const nextStopIdx = truck.currentStopIndex + 1;

      if (nextStopIdx < currentRun.stops.length) {
        const fromStop = currentRun.stops[truck.currentStopIndex];
        const toStop = currentRun.stops[nextStopIdx];
        truck.currentPath = buildRoutePath(fromStop, toStop);
        truck.pathProgress = 0;
        truck.currentStopIndex = nextStopIdx;
        truck.state = "EN_ROUTE";
      } else {
        // Last stop → return to depot
        const lastStop = currentRun.stops[truck.currentStopIndex];
        truck.currentPath = buildRoutePath(lastStop, DEPOT_WP);
        truck.pathProgress = 0;
        truck.state = "RETURNING";
      }
      break;
    }

    case "RETURNING": {
      advanceTruck(truck, world);

      if (truck.pathProgress >= 1.0) {
        // Arrived at depot — use path's end coordinate (no jump)
        if (truck.currentPath && truck.currentPath.coords.length > 0) {
          const endCoord = truck.currentPath.coords[truck.currentPath.coords.length - 1];
          truck.lat = endCoord.lat;
          truck.lng = endCoord.lng;
        }
        truck.currentPath = null;

        // Mark collection orders as PROCESSING
        if (currentRun?.type === "collection") {
          for (const oid of currentRun.orderIds) {
            const order = world.orders.find((o) => o.id === oid);
            if (order && order.status === "COMPLETED") {
              order.status = "PROCESSING";
            }
          }
        }

        if (currentRun) currentRun.completed = true;

        // Move to next run — start immediately (no artificial delay)
        truck.currentRunIndex++;
        truck.currentStopIndex = 0;
        truck.state = "AT_DEPOT";

        // Let next run start right away (just 1 sim-minute buffer)
        const nextRun = truck.runs[truck.currentRunIndex];
        if (nextRun) {
          nextRun.startHour = Math.max(nextRun.startHour, world.simHour + 0.02);
        }
      }
      break;
    }
  }
}

function advanceTruck(truck: SimTruckRuntime, world: SimWorld): void {
  if (!truck.currentPath || truck.currentPath.totalDist === 0) {
    truck.pathProgress = 1.0;
    return;
  }

  const congestion = getCongestionFactor(truck.lat, truck.lng, world.simHour);
  const effectiveSpeed = truck.baseSpeedKmh / congestion;
  const hpt = world.speed === "fast" ? FAST_HOURS_PER_TICK : REALTIME_HOURS_PER_TICK;
  const distThisTick = effectiveSpeed * hpt;
  truck.pathProgress += distThisTick / truck.currentPath.totalDist;

  if (truck.pathProgress >= 1.0) {
    truck.pathProgress = 1.0;
  } else {
    const pos = posOnPath(truck.currentPath, truck.pathProgress);
    truck.lat = pos.lat;
    truck.lng = pos.lng;
  }
}

// ── Helpers ────────────────────────────────────────────────

function formatSimTime(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.floor((hour - h) * 60);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function buildSummary(orders: SimOrder[]): DaySummary {
  const collections = orders.filter((o) => o.type === "collection");
  const dOrders = orders.filter((o) => o.type === "delivery");
  const collected = collections.filter((o) => o.status === "COMPLETED" || o.status === "PROCESSING").length;
  const delivered = dOrders.filter((o) => o.status === "COMPLETED").length;
  const lateCount = orders.filter((o) => o.isLate).length;
  const totalCompleted = collected + delivered;
  const onTimeCount = totalCompleted - lateCount;
  return {
    totalCollections: collections.length,
    collected,
    totalDeliveries: dOrders.length,
    delivered,
    lateCount,
    onTimePercent: totalCompleted > 0 ? (onTimeCount / totalCompleted) * 100 : 100,
    processing: collections.filter((o) => o.status === "PROCESSING").length,
  };
}

// ── Hook ───────────────────────────────────────────────────

export function useWorkdaySim(enabled: boolean) {
  const worldRef = useRef<SimWorld>(initWorld(0));
  const intervalRef = useRef<number>(0);

  const [drivers, setDrivers] = useState<DispatchDriver[]>([]);
  const [deliveries, setDeliveries] = useState<DispatchDelivery[]>([]);
  const [simOrders, setSimOrders] = useState<SimOrder[]>([]);
  const [simTrucks, setSimTrucks] = useState<SimTruckRuntime[]>([]);
  const [simClock, setSimClock] = useState<SimClock>({
    simHour: SIM_START_HOUR,
    simTimeLabel: formatSimTime(SIM_START_HOUR),
    dayProgress: 0,
    speed: "fast",
    dayComplete: false,
    dayCount: 0,
  });
  const [daySummary, setDaySummary] = useState<DaySummary | null>(null);

  const publish = useCallback(() => {
    const w = worldRef.current;

    setDrivers(
      w.trucks.map((t) => ({
        driverId: t.truckId,
        driverName: t.driverName,
        lat: t.lat,
        lng: t.lng,
        lastUpdated: new Date().toISOString(),
        isLive: true,
      })),
    );

    const activeDeliveries: DispatchDelivery[] = w.orders
      .filter((o) => o.status === "IN_PROGRESS")
      .map((o) => {
        const run = w.trucks
          .flatMap((t) => t.runs)
          .find((r) => r.orderIds.includes(o.id));
        return {
          orderId: o.id,
          orderNumber: o.orderNumber,
          driverId: run?.truckId ?? null,
          dropoffLat: o.lat,
          dropoffLng: o.lng,
          dropoffAddress: `${o.waypoint} ${o.type}`,
          status: o.status,
        };
      });
    setDeliveries(activeDeliveries);

    setSimOrders([...w.orders]);
    setSimTrucks(w.trucks.map((t) => ({ ...t })));
    setSimClock({
      simHour: w.simHour,
      simTimeLabel: formatSimTime(w.simHour),
      dayProgress: (w.simHour - SIM_START_HOUR) / (SIM_END_HOUR - SIM_START_HOUR),
      speed: w.speed,
      dayComplete: w.dayComplete,
      dayCount: w.dayCount,
    });

    if (w.dayComplete) {
      setDaySummary(buildSummary(w.orders));
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearInterval(intervalRef.current);
      setDrivers([]);
      setDeliveries([]);
      return;
    }

    worldRef.current = initWorld(0);
    publish();

    intervalRef.current = window.setInterval(() => {
      if (!worldRef.current.dayComplete) {
        tickWorld(worldRef.current);
      }
      publish();
    }, TICK_MS);

    return () => clearInterval(intervalRef.current);
  }, [enabled, publish]);

  const toggleSpeed = useCallback(() => {
    worldRef.current.speed =
      worldRef.current.speed === "fast" ? "realtime" : "fast";
    publish();
  }, [publish]);

  const startNextDay = useCallback(() => {
    const nextDay = worldRef.current.dayCount + 1;
    worldRef.current = initWorld(nextDay);
    setDaySummary(null);
    publish();
  }, [publish]);

  return {
    drivers,
    deliveries,
    simOrders,
    simTrucks,
    simClock,
    daySummary,
    toggleSpeed,
    startNextDay,
  };
}
