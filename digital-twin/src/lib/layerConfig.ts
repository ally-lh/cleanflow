import type { LayerId, LayerVisibility } from "../types";

export const LAYER_META: Record<LayerId, { label: string; color: string }> = {
  trucks:     { label: "Live Trucks",     color: "#22c55e" },
  clusters:   { label: "Cluster Zones",   color: "#8b5cf6" },
  density:    { label: "Order Density",   color: "#f97316" },
  congestion: { label: "Congestion Risk", color: "#ef4444" },
  expansion:  { label: "Expansion Zones", color: "#eab308" },
  routes:     { label: "Delivery Routes", color: "#06b6d4" },
  orders:     { label: "Order Pins",      color: "#f59e0b" },
};

export const DEFAULT_VISIBILITY: LayerVisibility = {
  trucks: true,
  clusters: true,
  density: false,
  congestion: false,
  expansion: false,
  routes: true,
  orders: true,
};

export const SG_CENTER: [number, number] = [1.3521, 103.8198];
export const SG_DEFAULT_ZOOM = 12;

export const CLUSTER_COLORS = [
  "#2563eb", "#14b8a6", "#8b5cf6", "#f97316",
  "#e11d48", "#0ea5e9", "#22c55e", "#f59e0b",
];
