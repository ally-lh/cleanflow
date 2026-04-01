import { CircleMarker, Tooltip } from "react-leaflet";
import type { ComponentType } from "react";
import type { DensityData } from "../../types";
import { DISTRICT_CENTROIDS } from "../../lib/districtCentroids";

const UnsafeCircleMarker = CircleMarker as unknown as ComponentType<Record<string, unknown>>;
const UnsafeTooltip = Tooltip as unknown as ComponentType<Record<string, unknown>>;

interface Props {
  density?: DensityData;
}

function intensityColor(ratio: number): string {
  // Green → Yellow → Red gradient based on order density
  if (ratio < 0.33) return "#22c55e";
  if (ratio < 0.66) return "#f59e0b";
  return "#ef4444";
}

export default function DensityLayer({ density }: Props) {
  const byDistrict = density?.byDistrictPrefix ?? {};
  const entries = Object.entries(byDistrict).filter(
    ([code]) => DISTRICT_CENTROIDS[code],
  );

  if (entries.length === 0) return null;

  const maxOrders = Math.max(1, ...entries.map(([, v]) => v));

  return (
    <>
      {entries.map(([code, count]) => {
        const centroid = DISTRICT_CENTROIDS[code];
        if (!centroid) return null;

        const ratio = count / maxOrders;
        const radius = 6 + ratio * 24;
        const color = intensityColor(ratio);

        return (
          <UnsafeCircleMarker
            key={`density-${code}`}
            center={[centroid.lat, centroid.lng]}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.25 + ratio * 0.35,
              weight: 1,
            }}
          >
            <UnsafeTooltip direction="top">
              {centroid.name} ({code}) — {count} orders
            </UnsafeTooltip>
          </UnsafeCircleMarker>
        );
      })}
    </>
  );
}
