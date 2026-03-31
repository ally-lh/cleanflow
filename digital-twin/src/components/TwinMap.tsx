import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import type { ComponentType } from "react";
import type {
  AnalyticsSnapshot,
  DispatchDriver,
  DispatchDelivery,
  LayerVisibility,
} from "../types";
import type { SimOrder } from "../lib/simTypes";
import { SG_CENTER, SG_DEFAULT_ZOOM } from "../lib/layerConfig";
import TruckLayer from "./layers/TruckLayer";
import ClusterLayer from "./layers/ClusterLayer";
import DensityLayer from "./layers/DensityLayer";
import CongestionLayer from "./layers/CongestionLayer";
import ExpansionLayer from "./layers/ExpansionLayer";
import RouteLayer from "./layers/RouteLayer";
import OrderLayer from "./layers/OrderLayer";

const UnsafeMapContainer = MapContainer as unknown as ComponentType<Record<string, unknown>>;
const UnsafeTileLayer = TileLayer as unknown as ComponentType<Record<string, unknown>>;
const UnsafeZoomControl = ZoomControl as unknown as ComponentType<Record<string, unknown>>;

interface Props {
  drivers: DispatchDriver[];
  deliveries: DispatchDelivery[];
  snapshot: AnalyticsSnapshot | null;
  layers: LayerVisibility;
  simOrders: SimOrder[];
  onSelectTruck: (driverId: string) => void;
  onSelectZone: (code: string) => void;
}

export default function TwinMap({
  drivers,
  deliveries,
  snapshot,
  layers,
  simOrders,
  onSelectTruck,
  onSelectZone,
}: Props) {
  return (
    <UnsafeMapContainer
      center={SG_CENTER}
      zoom={SG_DEFAULT_ZOOM}
      zoomControl={false}
      style={{ width: "100%", height: "100%" }}
    >
      <UnsafeTileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <UnsafeZoomControl position="bottomright" />

      {layers.clusters && (
        <ClusterLayer
          clustering={snapshot?.geo?.clustering}
          expansion={snapshot?.expansion}
        />
      )}
      {layers.density && (
        <DensityLayer density={snapshot?.geo?.densityByDistrict} />
      )}
      {layers.congestion && <CongestionLayer />}
      {layers.expansion && (
        <ExpansionLayer
          expansion={snapshot?.expansion}
          onSelectZone={onSelectZone}
        />
      )}
      {layers.routes && (
        <RouteLayer
          drivers={drivers}
          deliveries={deliveries}
          routeOptimization={snapshot?.geo?.routeOptimization}
        />
      )}
      {layers.orders && simOrders.length > 0 && (
        <OrderLayer orders={simOrders} />
      )}
      {layers.trucks && (
        <TruckLayer
          drivers={drivers}
          deliveries={deliveries}
          onSelectTruck={onSelectTruck}
        />
      )}
    </UnsafeMapContainer>
  );
}
