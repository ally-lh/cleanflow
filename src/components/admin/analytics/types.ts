export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteOptimization {
  ok?: boolean;
  baselineKm?: number;
  optimizedKm?: number;
  savingsKm?: number;
  savingsPercent?: number;
  assumption?: string;
  nStops?: number;
  roadFactor?: number;
  twoOptApplied?: boolean;
  depot?: LatLng;
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

export interface RevenueMetric {
  sum?: number;
  count?: number;
  mean?: number;
}

export interface TurnaroundData {
  ok?: boolean;
  reason?: string;
  median?: number;
  mean?: number;
  p90?: number;
  sampleSize?: number;
}

export interface BusinessData {
  ok?: boolean;
  revenueByServiceType?: Record<string, RevenueMetric>;
  pickupMethodCounts?: Record<string, number>;
  collectionMethodCounts?: Record<string, number>;
  turnaroundHours?: TurnaroundData;
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
  note?: string;
}

export interface AnalyticsSnapshot {
  generatedAt?: string;
  source?: string;
  sourceOrderCount?: number;
  geo?: {
    clustering?: ClusteringData;
    densityByDistrict?: DensityData;
    routeOptimization?: RouteOptimization;
  };
  business?: BusinessData;
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
      scatterStopsVsDistance?: Array<{
        driverId: string;
        driverLabel?: string;
        stops: number;
        distanceKm: number;
      }>;
    };
    revenueMix?: {
      totalRevenue?: number;
      services?: Array<{
        serviceType: string;
        revenue: number;
        avgOrderValue: number;
        orderCount: number;
        revenuePercent: number;
      }>;
    };
    demandPatterns?: {
      topDistricts?: Array<{ district: string; orders: number }>;
    };
    expansionAnalysis?: {
      rankedDistricts?: ExpansionDistrict[];
    };
    timeSeries?: {
      daily?: Array<{ date: string; orders: number }>;
    };
  };
}
