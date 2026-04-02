import { useState, useCallback, useMemo } from "react";
import type { LayerId, LayerVisibility } from "./types";
import { DEFAULT_VISIBILITY } from "./lib/layerConfig";
import { useDispatchLive } from "./hooks/useDispatchLive";
import { useAnalyticsSnapshot } from "./hooks/useAnalyticsSnapshot";
import { useWorkdaySim } from "./hooks/useWorkdaySim";
import TwinMap from "./components/TwinMap";
import HudBar from "./components/overlays/HudBar";
import LayerControls from "./components/overlays/LayerControls";
import TruckDetailPanel from "./components/overlays/TruckDetailPanel";
import ZoneDetailPanel from "./components/overlays/ZoneDetailPanel";
import DaySummaryOverlay from "./components/overlays/DaySummaryOverlay";
import FleetPanel from "./components/overlays/FleetPanel";
import InsightsPanel from "./components/overlays/InsightsPanel";
import { generateRecommendations } from "./lib/recommendations";

export default function App() {
  // Fetch once on mount — no auto-polling to minimize API costs.
  const { data: dispatch, error: dispatchError, refresh: refreshDispatch } = useDispatchLive();
  const { snapshot, error: snapshotError, refresh: refreshSnapshot } = useAnalyticsSnapshot();

  // If no live drivers have GPS, use workday simulation
  const hasLiveDrivers = useMemo(
    () => (dispatch?.drivers ?? []).some((d) => d.isLive),
    [dispatch],
  );

  const sim = useWorkdaySim(!hasLiveDrivers);

  // Merge: prefer real data when available, otherwise use simulation
  const drivers = hasLiveDrivers ? (dispatch?.drivers ?? []) : sim.drivers;
  const deliveries = hasLiveDrivers
    ? (dispatch?.deliveries ?? [])
    : sim.deliveries;

  // Layer visibility
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_VISIBILITY);
  const toggleLayer = useCallback((id: LayerId) => {
    setLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Selection state
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [selectedZoneCode, setSelectedZoneCode] = useState<string | null>(null);

  const handleSelectTruck = useCallback((id: string) => {
    setSelectedTruckId(id);
    setSelectedZoneCode(null);
  }, []);

  const handleSelectZone = useCallback((code: string) => {
    setSelectedZoneCode(code);
    setSelectedTruckId(null);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedTruckId(null);
    setSelectedZoneCode(null);
  }, []);

  // Derived
  const selectedDriver = selectedTruckId
    ? drivers.find((d) => d.driverId === selectedTruckId) ?? null
    : null;

  const selectedDriverDeliveries = selectedTruckId
    ? deliveries.filter((d) => d.driverId === selectedTruckId)
    : [];

  const isSimMode = !hasLiveDrivers && drivers.length > 0;

  // Generate contextual recommendations from analytics + sim state
  const recommendations = useMemo(
    () =>
      isSimMode
        ? generateRecommendations(sim.simTrucks, sim.simOrders, sim.simClock.simHour, snapshot)
        : [],
    [isSimMode, sim.simTrucks, sim.simOrders, sim.simClock.simHour, snapshot],
  );

  return (
    <div className="w-full h-full relative">
      {/* Full-viewport map */}
      <TwinMap
        drivers={drivers}
        deliveries={deliveries}
        snapshot={snapshot}
        layers={layers}
        simOrders={isSimMode ? sim.simOrders : []}
        onSelectTruck={handleSelectTruck}
        onSelectZone={handleSelectZone}
      />

      {/* Branding */}
      <div className="absolute top-3 left-3 z-[1000] pointer-events-none">
        <div className="text-white font-bold text-sm tracking-wide">
          CleanFlow
          <span className="text-cyan-400 ml-1 font-normal text-xs">Digital Twin</span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
        <div className="flex items-center gap-4 bg-gray-900/70 backdrop-blur-md rounded-lg px-3 py-1.5 border border-gray-700/30">
          <LegendItem color="#22c55e" label="Truck (active)" />
          <LegendItem color="#3b82f6" label="Truck (idle)" />
          <LegendItem color="#f59e0b" label="Collection pickup" />
          <LegendItem color="#06b6d4" label="Delivery dropoff" />
          <LegendItem color="#ef4444" label="Late" />
          <LegendItem color="#a78bfa" dashed label="Demand zone" />
        </div>
      </div>

      {/* HUD */}
      <HudBar
        snapshot={snapshot}
        drivers={drivers}
        lastUpdated={dispatch?.lastUpdated ?? null}
        dispatchError={dispatchError}
        snapshotError={snapshotError}
        onRefresh={() => { refreshDispatch(); refreshSnapshot(); }}
        simClock={isSimMode ? sim.simClock : null}
        simOrders={isSimMode ? sim.simOrders : []}
        onToggleSpeed={sim.toggleSpeed}
      />

      {/* Layer toggles */}
      <LayerControls visibility={layers} onChange={toggleLayer} />

      {/* Analytics insights */}
      {isSimMode && !sim.daySummary && (
        <InsightsPanel recommendations={recommendations} simTimeLabel={sim.simClock.simTimeLabel} />
      )}

      {/* Fleet activity panel */}
      {isSimMode && !sim.daySummary && (
        <FleetPanel
          trucks={sim.simTrucks}
          orders={sim.simOrders}
          onSelectTruck={handleSelectTruck}
        />
      )}

      {/* Day summary overlay */}
      {isSimMode && sim.daySummary && (
        <DaySummaryOverlay
          summary={sim.daySummary}
          dayCount={sim.simClock.dayCount}
          onStartNextDay={sim.startNextDay}
        />
      )}

      {/* Detail panels */}
      {selectedDriver && (
        <TruckDetailPanel
          driver={selectedDriver}
          deliveries={selectedDriverDeliveries}
          simTruck={isSimMode ? sim.simTrucks.find((t) => t.truckId === selectedTruckId) : undefined}
          simOrders={isSimMode ? sim.simOrders : undefined}
          onClose={handleClosePanel}
        />
      )}
      {selectedZoneCode && !selectedDriver && (
        <ZoneDetailPanel
          zoneCode={selectedZoneCode}
          expansion={snapshot?.expansion}
          density={snapshot?.geo?.densityByDistrict}
          onClose={handleClosePanel}
        />
      )}
    </div>
  );
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-gray-300">
      <span
        className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
        style={{
          backgroundColor: dashed ? "transparent" : color,
          border: `2px ${dashed ? "dashed" : "solid"} ${color}`,
        }}
      />
      {label}
    </span>
  );
}
