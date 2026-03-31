import { CircleMarker, Tooltip } from "react-leaflet";
import type { ComponentType } from "react";
import type { ExpansionData } from "../../types";
import { DISTRICT_CENTROIDS } from "../../lib/districtCentroids";

const UnsafeCircleMarker = CircleMarker as unknown as ComponentType<Record<string, unknown>>;
const UnsafeTooltip = Tooltip as unknown as ComponentType<Record<string, unknown>>;

interface Props {
  expansion?: ExpansionData;
  onSelectZone: (code: string) => void;
}

export default function ExpansionLayer({ expansion, onSelectZone }: Props) {
  const districts = expansion?.districts ?? [];
  const hotList = new Set(expansion?.highDemandFarDistrictsHeuristic ?? []);

  if (districts.length === 0) return null;

  return (
    <>
      {districts.map((d) => {
        const centroid = DISTRICT_CENTROIDS[d.district];
        if (!centroid) return null;

        const isHot = hotList.has(d.district);
        const color = isHot ? "#eab308" : "#6366f1";
        const radius = 6 + Math.min(d.orderCount, 60) * 0.3;

        return (
          <UnsafeCircleMarker
            key={`expansion-${d.district}`}
            center={[centroid.lat, centroid.lng]}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: isHot ? 0.35 : 0.15,
              weight: isHot ? 3 : 1,
              dashArray: isHot ? "8 4" : "4 2",
            }}
            eventHandlers={{ click: () => onSelectZone(d.district) }}
          >
            <UnsafeTooltip direction="top">
              <div style={{ fontSize: 11 }}>
                <strong>
                  {centroid.name} ({d.district})
                </strong>
                <br />
                {d.orderCount} orders — {d.meanDistanceFromDepotKm.toFixed(1)} km
                from depot
                {isHot && (
                  <>
                    <br />
                    <span style={{ color: "#eab308" }}>
                      High-demand expansion opportunity
                    </span>
                  </>
                )}
              </div>
            </UnsafeTooltip>
          </UnsafeCircleMarker>
        );
      })}
    </>
  );
}
