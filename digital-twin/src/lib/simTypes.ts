// ── Order types ─────────────────────────────────────────────

export type SimOrderType = "collection" | "delivery";

export type SimOrderStatus =
  | "PENDING"      // Awaiting truck
  | "IN_PROGRESS"  // Truck en route to this stop
  | "COMPLETED"    // Picked up or delivered
  | "PROCESSING";  // At facility being washed (collection only)

export interface SimOrder {
  id: string;
  orderNumber: string;
  type: SimOrderType;
  waypoint: string;       // customer location waypoint name
  lat: number;
  lng: number;
  status: SimOrderStatus;
  isLate: boolean;
  completedAtHour: number | null;
  runId: string;          // which run this belongs to
}

// ── Runs ────────────────────────────────────────────────────

export interface SimRun {
  id: string;
  type: SimOrderType;     // "collection" or "delivery"
  truckId: string;
  stops: string[];        // waypoint names in visit order
  orderIds: string[];     // one order per stop (parallel with stops)
  startHour: number;      // sim hour when truck departs depot
  completed: boolean;
}

// ── Truck state machine ────────────────────────────────────

export type SimTruckState =
  | "AT_DEPOT"
  | "EN_ROUTE"
  | "AT_STOP"
  | "RETURNING";

export interface SimTruckRuntime {
  truckId: string;
  driverName: string;
  hub: string;
  baseSpeedKmh: number;
  state: SimTruckState;
  lat: number;
  lng: number;
  // Current run
  currentRunIndex: number;  // index into assigned runs list
  currentStopIndex: number; // which stop within the run
  runs: SimRun[];           // assigned runs for the day
  // Path traversal
  currentPath: { coords: { lat: number; lng: number }[]; totalDist: number; segDists: number[] } | null;
  pathProgress: number;
  // Timing
  dwellUntilHour: number;
  // Stats
  collectionsToday: number;
  deliveriesToday: number;
}

// ── Simulation clock ───────────────────────────────────────

export type SimSpeed = "fast" | "realtime";

export interface SimClock {
  simHour: number;
  simTimeLabel: string;
  dayProgress: number;
  speed: SimSpeed;
  dayComplete: boolean;
  dayCount: number;
}

// ── Day summary ────────────────────────────────────────────

export interface DaySummary {
  totalCollections: number;
  collected: number;
  totalDeliveries: number;
  delivered: number;
  lateCount: number;
  onTimePercent: number;
  processing: number;
}

// ── Constants ──────────────────────────────────────────────

export const SIM_START_HOUR = 8.0;
export const SIM_END_HOUR = 16.0;
export const SIM_DURATION_HOURS = SIM_END_HOUR - SIM_START_HOUR;
export const TICK_MS = 200;
export const FAST_HOURS_PER_TICK = SIM_DURATION_HOURS / (300_000 / TICK_MS); // 5 min real
export const REALTIME_HOURS_PER_TICK = (TICK_MS / 1000) / 3600;
export const DWELL_HOURS = 0.02; // ~1 sim-minute at each stop
export const DEPOT_LOAD_HOURS = 0.02; // ~1 sim-minute loading at depot between runs
export const LATE_THRESHOLD_HOURS = 1.5;
