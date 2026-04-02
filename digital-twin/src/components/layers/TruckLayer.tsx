import { useEffect, useRef } from "react";
import { Marker, Tooltip } from "react-leaflet";
import type { ComponentType } from "react";
import type { Marker as LeafletMarker } from "leaflet";
import { createTruckIcon } from "../../lib/truckIcon";
import type { DispatchDriver, DispatchDelivery } from "../../types";

const UnsafeMarker = Marker as unknown as ComponentType<Record<string, unknown>>;
const UnsafeTooltip = Tooltip as unknown as ComponentType<Record<string, unknown>>;

interface Props {
  drivers: DispatchDriver[];
  deliveries: DispatchDelivery[];
  onSelectTruck: (driverId: string) => void;
}

function computeHeading(
  prevLat: number, prevLng: number,
  lat: number, lng: number,
): number {
  const dLat = lat - prevLat;
  const dLng = lng - prevLng;
  if (Math.abs(dLat) < 1e-8 && Math.abs(dLng) < 1e-8) return 0;
  // atan2 gives angle from east; rotate so 0° = north
  const rad = Math.atan2(dLng, dLat);
  return (rad * 180) / Math.PI;
}

function AnimatedTruckMarker({
  driver,
  deliveryCount,
  onSelect,
}: {
  driver: DispatchDriver;
  deliveryCount: number;
  onSelect: () => void;
}) {
  const markerRef = useRef<LeafletMarker | null>(null);
  const prevPos = useRef<{ lat: number; lng: number } | null>(null);
  const headingRef = useRef(0);

  const status = !driver.isLive
    ? "offline"
    : deliveryCount > 0
      ? "active"
      : "idle";

  // Compute heading from position change
  if (prevPos.current) {
    const newHeading = computeHeading(
      prevPos.current.lat, prevPos.current.lng,
      driver.lat, driver.lng,
    );
    // Only update if there was meaningful movement
    const dLat = driver.lat - prevPos.current.lat;
    const dLng = driver.lng - prevPos.current.lng;
    if (Math.abs(dLat) > 1e-7 || Math.abs(dLng) > 1e-7) {
      headingRef.current = newHeading;
    }
  }
  prevPos.current = { lat: driver.lat, lng: driver.lng };

  const icon = createTruckIcon(status, headingRef.current);

  useEffect(() => {
    const marker = markerRef.current;
    if (marker) {
      marker.setLatLng([driver.lat, driver.lng]);
      marker.setIcon(icon);
    }
  }, [driver.lat, driver.lng, icon]);

  return (
    <UnsafeMarker
      position={[driver.lat, driver.lng]}
      icon={icon}
      ref={markerRef}
      eventHandlers={{ click: onSelect }}
    >
      <UnsafeTooltip direction="top" offset={[0, -16]}>
        <div className="text-xs">
          <strong>{driver.driverName}</strong>
          <br />
          {status === "active"
            ? `${deliveryCount} active delivery${deliveryCount > 1 ? "ies" : ""}`
            : status === "idle"
              ? "Idle"
              : "Offline"}
        </div>
      </UnsafeTooltip>
    </UnsafeMarker>
  );
}

export default function TruckLayer({ drivers, deliveries, onSelectTruck }: Props) {
  return (
    <>
      {drivers.map((driver) => {
        const driverDeliveries = deliveries.filter(
          (d) => d.driverId === driver.driverId,
        );
        return (
          <AnimatedTruckMarker
            key={driver.driverId}
            driver={driver}
            deliveryCount={driverDeliveries.length}
            onSelect={() => onSelectTruck(driver.driverId)}
          />
        );
      })}
    </>
  );
}
