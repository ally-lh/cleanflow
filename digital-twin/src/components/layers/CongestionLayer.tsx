import { CircleMarker, Tooltip } from "react-leaflet";
import type { ComponentType } from "react";
import { DISTRICT_CONFIG, RISK_COLORS, CONGESTION_IDX } from "../../lib/congestionData";
import { DISTRICT_CENTROIDS } from "../../lib/districtCentroids";

const UnsafeCircleMarker = CircleMarker as unknown as ComponentType<Record<string, unknown>>;
const UnsafeTooltip = Tooltip as unknown as ComponentType<Record<string, unknown>>;

function getCurrentCongestionIndex(): number {
  const hour = new Date().getHours();
  // CONGESTION_IDX covers 5am (index 0) to 10pm (index 17)
  const idx = hour - 5;
  if (idx < 0 || idx >= CONGESTION_IDX.length) return 1.0;
  return CONGESTION_IDX[idx];
}

export default function CongestionLayer() {
  const currentIdx = getCurrentCongestionIndex();

  return (
    <>
      {DISTRICT_CONFIG.map((d) => {
        const centroid = DISTRICT_CENTROIDS[d.code];
        if (!centroid) return null;

        const color = RISK_COLORS[d.risk];
        const radius = 10 + (d.factor - 1.2) * 20;

        return (
          <UnsafeCircleMarker
            key={`congestion-${d.code}`}
            center={[centroid.lat, centroid.lng]}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.2 + (d.factor - 1.2) * 0.4,
              weight: 2,
              dashArray: d.risk === "High" ? undefined : "4 4",
            }}
          >
            <UnsafeTooltip direction="top">
              <div style={{ fontSize: 11 }}>
                <strong>
                  {centroid.name} ({d.code})
                </strong>
                <br />
                Risk: {d.risk} — Factor: x{d.factor.toFixed(2)}
                <br />
                Best window: {d.window}
                <br />
                Expressway: {d.expressway}
                <br />
                Current city index: x{currentIdx.toFixed(2)}
              </div>
            </UnsafeTooltip>
          </UnsafeCircleMarker>
        );
      })}
    </>
  );
}
