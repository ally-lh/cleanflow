// ── Dispatch Live API response ──────────────────────────────

export interface DispatchDriver {
  driverId: string;
  driverName: string;
  lat: number;
  lng: number;
  lastUpdated: string | null;
  isLive: boolean;
}

export interface DispatchDelivery {
  orderId: string;
  orderNumber: string;
  driverId: string | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  dropoffAddress: string | null;
  status: string;
}

export interface DispatchLiveResponse {
  drivers: DispatchDriver[];
  deliveries: DispatchDelivery[];
  lastUpdated: string;
}

// ── Analytics Snapshot (subset from python-analytics) ───────

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ClusteringData {
  ok?: boolean;
  k?: number;
  clusterSizes?: Record<string, number>;
  centroids?: LatLng[];
}

export interface DensityData {
  ok?: boolean;
  byDistrictPrefix?: Record<string, number>;
}

export interface RouteOptimization {
  ok?: boolean;
  baselineKm?: number;
  optimizedKm?: number;
  savingsKm?: number;
  savingsPercent?: number;
  nStops?: number;
  depot?: LatLng;
  twoOptApplied?: boolean;
}

export interface ExpansionDistrict {
  district: string;
  orderCount: number;
  meanDistanceFromDepotKm: number;
}

export interface ExpansionData {
  ok?: boolean;
  depot?: LatLng;
  districts?: ExpansionDistrict[];
  highDemandFarDistrictsHeuristic?: string[];
}

export interface AnalyticsSnapshot {
  generatedAt?: string;
  sourceOrderCount?: number;
  geo?: {
    clustering?: ClusteringData;
    densityByDistrict?: DensityData;
    routeOptimization?: RouteOptimization;
  };
  business?: {
    ok?: boolean;
    revenueByServiceType?: Record<
      string,
      { sum?: number; count?: number; mean?: number }
    >;
    turnaroundHours?: {
      median?: number;
      mean?: number;
      p90?: number;
      sampleSize?: number;
    };
  };
  expansion?: ExpansionData;
  charts?: {
    kpis?: {
      totalOrders?: number;
      totalRevenue?: number;
      avgOrderValue?: number;
      totalDistanceSavedKm?: number;
      avgSavingsRatePercent?: number;
    };
    operationalEfficiency?: {
      drivers?: Array<{
        driverId: string;
        driverLabel?: string;
        baselineKm: number;
        optimizedKm: number;
        savingsKm: number;
        savingsPercent: number;
        stops: number;
      }>;
    };
    demandPatterns?: {
      topDistricts?: Array<{ district: string; orders: number }>;
    };
    timeSeries?: {
      daily?: Array<{ date: string; orders: number }>;
    };
  };
}

// ── Layer system ────────────────────────────────────────────

export type LayerId =
  | "trucks"
  | "clusters"
  | "density"
  | "congestion"
  | "expansion"
  | "routes"
  | "orders";

export type LayerVisibility = Record<LayerId, boolean>;
