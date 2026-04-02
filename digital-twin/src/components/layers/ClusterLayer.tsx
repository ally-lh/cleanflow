import { CircleMarker, Tooltip } from "react-leaflet";
import type { ComponentType } from "react";
import type { ClusteringData, ExpansionData } from "../../types";
import { CLUSTER_COLORS } from "../../lib/layerConfig";

const UnsafeCircleMarker = CircleMarker as unknown as ComponentType<Record<string, unknown>>;
const UnsafeTooltip = Tooltip as unknown as ComponentType<Record<string, unknown>>;

interface Props {
  clustering?: ClusteringData;
  expansion?: ExpansionData;
}

export default function ClusterLayer({ clustering, expansion }: Props) {
  const centroids = clustering?.centroids ?? [];
  const sizes = clustering?.clusterSizes ?? {};
  const maxSize = Math.max(
    1,
    ...Object.values(sizes).map((v) => (typeof v === "number" ? v : 0)),
  );

  return (
    <>
      {/* Depot marker */}
      {expansion?.depot?.lat && expansion?.depot?.lng && (
        <UnsafeCircleMarker
          center={[expansion.depot.lat, expansion.depot.lng]}
          radius={6}
          pathOptions={{
            color: "#ffffff",
            fillColor: "#ffffff",
            fillOpacity: 0.7,
            weight: 1,
          }}
        >
          <UnsafeTooltip direction="top">CleanFlow Depot</UnsafeTooltip>
        </UnsafeCircleMarker>
      )}

      {/* Demand cluster zones — subtle background context */}
      {centroids.map((point, i) => {
        const count = Number(sizes[String(i)] ?? 0);
        const radius = 8 + (count / maxSize) * 25;
        const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
        return (
          <UnsafeCircleMarker
            key={`cluster-${i}`}
            center={[point.lat, point.lng]}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.08,
              weight: 1,
              dashArray: "4 4",
            }}
          >
            <UnsafeTooltip direction="top">
              <div style={{ fontSize: 11 }}>
                <strong>Demand Zone {i + 1}</strong>
                <br />
                {count} orders originate from this area
              </div>
            </UnsafeTooltip>
          </UnsafeCircleMarker>
        );
      })}
    </>
  );
}
