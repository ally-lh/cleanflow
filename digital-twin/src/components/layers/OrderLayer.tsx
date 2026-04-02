import { CircleMarker, Tooltip } from "react-leaflet";
import type { ComponentType } from "react";
import type { SimOrder } from "../../lib/simTypes";

const UnsafeCircleMarker = CircleMarker as unknown as ComponentType<Record<string, unknown>>;
const UnsafeTooltip = Tooltip as unknown as ComponentType<Record<string, unknown>>;

interface Props {
  orders: SimOrder[];
}

function orderStyle(order: SimOrder) {
  const isCollection = order.type === "collection";

  switch (order.status) {
    case "PENDING":
      return {
        color: isCollection ? "#f59e0b" : "#06b6d4", // amber for collection, cyan for delivery
        fillOpacity: 0.5,
        radius: 7,
        dashArray: "4 3",
      };
    case "IN_PROGRESS":
      return {
        color: isCollection ? "#f59e0b" : "#06b6d4",
        fillOpacity: 0.8,
        radius: 7,
        dashArray: undefined,
      };
    case "COMPLETED":
      return {
        color: "#22c55e",
        fillOpacity: 0.3,
        radius: 5,
        dashArray: undefined,
      };
    case "PROCESSING":
      return {
        color: "#a78bfa", // purple for processing
        fillOpacity: 0.3,
        radius: 5,
        dashArray: "2 2",
      };
    default:
      return { color: "#6b7280", fillOpacity: 0.3, radius: 5, dashArray: undefined };
  }
}

export default function OrderLayer({ orders }: Props) {
  return (
    <>
      {orders.map((order) => {
        // Don't show processing orders on map (they're at the facility)
        if (order.status === "PROCESSING") return null;
        // Fade out completed orders quickly — skip if completed
        if (order.status === "COMPLETED") return null;

        const style = orderStyle(order);
        const borderColor = order.isLate ? "#ef4444" : style.color;
        const typeLabel = order.type === "collection" ? "Pickup" : "Delivery";

        return (
          <UnsafeCircleMarker
            key={order.id}
            center={[order.lat, order.lng]}
            radius={style.radius}
            pathOptions={{
              color: borderColor,
              fillColor: order.isLate ? "#ef4444" : style.color,
              fillOpacity: style.fillOpacity,
              weight: order.isLate ? 3 : 2,
              dashArray: style.dashArray,
            }}
          >
            <UnsafeTooltip direction="top">
              <div style={{ fontSize: 11 }}>
                <strong>{order.orderNumber}</strong>
                {order.isLate && <span style={{ color: "#ef4444" }}> LATE</span>}
                <br />
                {order.status === "PENDING" && `${typeLabel} — ${order.waypoint}`}
                {order.status === "IN_PROGRESS" && `${typeLabel} in progress — ${order.waypoint}`}
              </div>
            </UnsafeTooltip>
          </UnsafeCircleMarker>
        );
      })}
    </>
  );
}
