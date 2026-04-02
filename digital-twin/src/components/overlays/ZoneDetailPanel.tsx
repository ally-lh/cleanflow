import type { ExpansionData, DensityData } from "../../types";
import { DISTRICT_CENTROIDS } from "../../lib/districtCentroids";
import { DISTRICT_CONFIG, RISK_COLORS } from "../../lib/congestionData";

interface Props {
  zoneCode: string;
  expansion?: ExpansionData;
  density?: DensityData;
  onClose: () => void;
}

export default function ZoneDetailPanel({
  zoneCode,
  expansion,
  density,
  onClose,
}: Props) {
  const centroid = DISTRICT_CENTROIDS[zoneCode];
  const congestion = DISTRICT_CONFIG.find((d) => d.code === zoneCode);
  const expansionDistrict = expansion?.districts?.find(
    (d) => d.district === zoneCode,
  );
  const isHotExpansion =
    expansion?.highDemandFarDistrictsHeuristic?.includes(zoneCode) ?? false;
  const orderCount = density?.byDistrictPrefix?.[zoneCode] ?? expansionDistrict?.orderCount ?? 0;

  return (
    <div className="absolute top-0 right-0 bottom-0 z-[1000] pointer-events-auto w-80 bg-gray-900/90 backdrop-blur-md border-l border-gray-700/50 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div>
          <h3 className="text-sm font-semibold text-white">
            {centroid?.name ?? `District ${zoneCode}`}
          </h3>
          <span className="text-xs text-gray-400">
            Postal District {zoneCode}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-lg leading-none px-1"
        >
          x
        </button>
      </div>

      {/* Info */}
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Order volume */}
        <Section label="Order Volume">
          <div className="text-2xl font-bold text-white">{orderCount}</div>
          <p className="text-[10px] text-gray-500">total orders in this district</p>
        </Section>

        {/* Distance from depot */}
        {expansionDistrict && (
          <Section label="Distance from Depot">
            <div className="text-lg font-semibold text-white">
              {expansionDistrict.meanDistanceFromDepotKm.toFixed(1)} km
            </div>
          </Section>
        )}

        {/* Congestion */}
        {congestion && (
          <Section label="Congestion Risk">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: RISK_COLORS[congestion.risk] + "20",
                  color: RISK_COLORS[congestion.risk],
                }}
              >
                {congestion.risk}
              </span>
              <span className="text-sm font-semibold text-white">
                x{congestion.factor.toFixed(2)}
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-gray-400">
              <p>
                <span className="text-gray-500">Best window:</span>{" "}
                {congestion.window}
              </p>
              <p>
                <span className="text-gray-500">Expressway:</span>{" "}
                {congestion.expressway}
              </p>
            </div>
          </Section>
        )}

        {/* Expansion flag */}
        {isHotExpansion && (
          <Section label="Expansion Opportunity">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2.5">
              <p className="text-xs text-yellow-400 font-medium">
                High-demand, far from depot
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                This district has above-average order volume but is far from the
                depot — consider a satellite hub or dedicated route.
              </p>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}
