import type { LayerId, LayerVisibility } from "../../types";
import { LAYER_META } from "../../lib/layerConfig";

interface Props {
  visibility: LayerVisibility;
  onChange: (id: LayerId) => void;
}

const LAYER_ORDER: LayerId[] = [
  "trucks",
  "routes",
  "orders",
  "clusters",
  "density",
  "congestion",
  "expansion",
];

export default function LayerControls({ visibility, onChange }: Props) {
  return (
    <div className="absolute top-16 right-3 z-[1000] pointer-events-auto">
      <div className="bg-gray-900/85 backdrop-blur-md rounded-xl border border-gray-700/50 p-3 shadow-2xl min-w-44">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2 px-1">
          Map Layers
        </div>
        <div className="space-y-1">
          {LAYER_ORDER.map((id) => {
            const meta = LAYER_META[id];
            const active = visibility[id];
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                  active
                    ? "bg-gray-800 text-white"
                    : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-opacity"
                  style={{
                    backgroundColor: meta.color,
                    opacity: active ? 1 : 0.3,
                  }}
                />
                <span>{meta.label}</span>
                <span
                  className={`ml-auto text-[10px] ${active ? "text-green-400" : "text-gray-600"}`}
                >
                  {active ? "ON" : "OFF"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
