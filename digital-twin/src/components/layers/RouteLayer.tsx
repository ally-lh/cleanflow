import { CircleMarker, Polyline, Tooltip } from "react-leaflet";
import type { ComponentType } from "react";
import type { DispatchDriver, DispatchDelivery, RouteOptimization } from "../../types";

const UnsafePolyline = Polyline as unknown as ComponentType<Record<string, unknown>>;
const UnsafeCircleMarker = CircleMarker as unknown as ComponentType<Record<string, unknown>>;
const UnsafeTooltip = Tooltip as unknown as ComponentType<Record<string, unknown>>;

interface Props {
  drivers: DispatchDriver[];
  deliveries: DispatchDelivery[];
  routeOptimization?: RouteOptimization;
}

const ROUTE_COLORS = [
  "#06b6d4", "#a78bfa", "#34d399", "#fb923c",
  "#f472b6", "#60a5fa", "#fbbf24", "#4ade80",
];

export default function RouteLayer({
  drivers,
  deliveries,
  routeOptimization,
}: Props) {
  const driverDeliveries = new Map<string, DispatchDelivery[]>();
  for (const d of deliveries) {
    if (!d.driverId || d.dropoffLat == null || d.dropoffLng == null) continue;
    const list = driverDeliveries.get(d.driverId) ?? [];
    list.push(d);
    driverDeliveries.set(d.driverId, list);
  }

  const depot = routeOptimization?.depot;

  return (
    <>
      {depot && (
        <UnsafeCircleMarker
          center={[depot.lat, depot.lng]}
          radius={6}
          pathOptions={{
            color: "#ffffff",
            fillColor: "#06b6d4",
            fillOpacity: 0.9,
            weight: 2,
          }}
        >
          <UnsafeTooltip direction="top">Depot</UnsafeTooltip>
        </UnsafeCircleMarker>
      )}

      {/* Draw a line from each active truck to its current delivery destination */}
      {Array.from(driverDeliveries.entries()).map(
        ([driverId, driverDels], idx) => {
          const driver = drivers.find((d) => d.driverId === driverId);
          if (!driver) return null;

          const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];

          return (
            <span key={driverId}>
              {/* Simple line from truck to each dropoff — shows intent */}
              {driverDels.map((del) => {
                if (del.dropoffLat == null || del.dropoffLng == null) return null;
                return (
                  <UnsafePolyline
                    key={`line-${del.orderId}`}
                    positions={[
                      [driver.lat, driver.lng],
                      [del.dropoffLat, del.dropoffLng],
                    ]}
                    pathOptions={{
                      color,
                      weight: 1.5,
                      opacity: 0.3,
                      dashArray: "6 4",
                    }}
                  />
                );
              })}
            </span>
          );
        },
      )}
    </>
  );
}
