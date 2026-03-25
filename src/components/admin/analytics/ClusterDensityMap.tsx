"use client";

import "leaflet/dist/leaflet.css";

import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";
import type { ComponentType } from "react";

import type { ClusteringData, ExpansionData } from "./types";

interface Props {
  clustering?: ClusteringData;
  expansion?: ExpansionData;
}

const mapCenter: [number, number] = [1.3521, 103.8198];
const CLUSTER_COLORS = [
  "#2563eb",
  "#14b8a6",
  "#8b5cf6",
  "#f97316",
  "#e11d48",
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
];
const UnsafeMapContainer = MapContainer as unknown as ComponentType<Record<string, unknown>>;
const UnsafeTileLayer = TileLayer as unknown as ComponentType<Record<string, unknown>>;
const UnsafeCircleMarker = CircleMarker as unknown as ComponentType<Record<string, unknown>>;
const UnsafeTooltip = Tooltip as unknown as ComponentType<Record<string, unknown>>;
const UnsafePopup = Popup as unknown as ComponentType<Record<string, unknown>>;

export default function ClusterDensityMap({ clustering, expansion }: Props) {
  const centroids = clustering?.centroids ?? [];
  const sizes = clustering?.clusterSizes ?? {};
  const maxSize = Math.max(
    1,
    ...Object.values(sizes).map((value) => (typeof value === "number" ? value : 0))
  );

  return (
    <UnsafeMapContainer
      center={mapCenter}
      zoom={11}
      scrollWheelZoom={false}
      style={{ height: 420, width: "100%" }}
      className="rounded-xl"
    >
      <UnsafeTileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {(expansion?.depot?.lat && expansion?.depot?.lng) ? (
        <UnsafeCircleMarker
          center={[expansion.depot.lat, expansion.depot.lng]}
          radius={10}
          pathOptions={{ color: "#111827", fillColor: "#111827", fillOpacity: 0.85 }}
        >
          <UnsafeTooltip direction="top">Depot</UnsafeTooltip>
          <UnsafePopup>CleanFlow depot</UnsafePopup>
        </UnsafeCircleMarker>
      ) : null}

      {centroids.map((point, index) => {
        const count = Number(sizes[String(index)] ?? 0);
        const radius = 6 + (count / maxSize) * 20;
        const color = CLUSTER_COLORS[index % CLUSTER_COLORS.length];
        return (
          <UnsafeCircleMarker
            key={`${point.lat}-${point.lng}-${index}`}
            center={[point.lat, point.lng]}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.35 + (count / maxSize) * 0.5,
            }}
          >
            <UnsafeTooltip direction="top">Cluster {index} · {count} orders</UnsafeTooltip>
            <UnsafePopup>
              Cluster {index}
              <br />
              Size: {count}
              <br />
              Lat/Lng: {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
            </UnsafePopup>
          </UnsafeCircleMarker>
        );
      })}
    </UnsafeMapContainer>
  );
}
