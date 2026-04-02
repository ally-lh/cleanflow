import { useEffect, useRef, useState } from "react";
import type { Recommendation } from "../../lib/recommendations";

interface TimestampedRec extends Recommendation {
  timestamp: string; // sim time when it appeared
}

interface Props {
  recommendations: Recommendation[];
  simTimeLabel: string;
}

const PRIORITY_STYLES: Record<string, { border: string; bg: string; icon: string }> = {
  critical: { border: "border-l-red-500",   bg: "bg-red-500/10",   icon: "text-red-400" },
  high:     { border: "border-l-amber-500", bg: "bg-amber-500/10", icon: "text-amber-400" },
  medium:   { border: "border-l-blue-500",  bg: "bg-blue-500/10",  icon: "text-blue-400" },
};

const TYPE_LABELS: Record<string, string> = {
  congestion: "CONGESTION",
  fleet:      "FLEET",
  demand:     "DEMAND",
  expansion:  "EXPANSION",
  window:     "DISPATCH",
};

export default function InsightsPanel({ recommendations, simTimeLabel }: Props) {
  const [history, setHistory] = useState<TimestampedRec[]>([]);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef(new Set<string>());

  // Accumulate new recommendations into history
  useEffect(() => {
    const newRecs: TimestampedRec[] = [];
    for (const rec of recommendations) {
      if (!seenIds.current.has(rec.id)) {
        seenIds.current.add(rec.id);
        newRecs.push({ ...rec, timestamp: simTimeLabel });
      }
    }
    if (newRecs.length > 0) {
      setHistory((prev) => [...newRecs, ...prev]);
    }
  }, [recommendations, simTimeLabel]);

  // Auto-scroll to top when new items arrive
  useEffect(() => {
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = 0;
    }
  }, [history.length, expanded]);

  // Reset history when day restarts (simTimeLabel goes back to 8:00)
  useEffect(() => {
    if (simTimeLabel === "8:00 AM") {
      setHistory([]);
      seenIds.current.clear();
    }
  }, [simTimeLabel]);

  const activeRecs = recommendations;
  const pastRecs = history.filter((h) => !activeRecs.some((r) => r.id === h.id));

  if (history.length === 0 && activeRecs.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-4 z-[1000] pointer-events-auto">
      <div className="w-80 flex flex-col">
        {/* Header with toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center justify-between px-2 py-1 mb-1"
        >
          <span className="text-[10px] uppercase tracking-wider text-gray-500">
            Analytics Insights
          </span>
          <span className="text-[10px] text-gray-500">
            {history.length} total {expanded ? "▼" : "▲"}
          </span>
        </button>

        {/* Active recommendations (always visible) */}
        <div className="space-y-2">
          {activeRecs.map((rec) => (
            <RecCard key={rec.id} rec={rec} />
          ))}
        </div>

        {/* Scrollable history (shown when expanded) */}
        {expanded && pastRecs.length > 0 && (
          <div
            ref={scrollRef}
            className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1 border-t border-gray-700/30 pt-2"
          >
            <div className="text-[9px] uppercase tracking-wider text-gray-600 px-1 mb-1">
              History
            </div>
            {pastRecs.map((rec, i) => (
              <RecCard key={`${rec.id}-${i}`} rec={rec} faded timestamp={rec.timestamp} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecCard({
  rec,
  faded,
  timestamp,
}: {
  rec: Recommendation | TimestampedRec;
  faded?: boolean;
  timestamp?: string;
}) {
  const style = PRIORITY_STYLES[rec.priority] ?? PRIORITY_STYLES.medium;
  const typeLabel = TYPE_LABELS[rec.type] ?? rec.type.toUpperCase();

  return (
    <div
      className={`${style.bg} backdrop-blur-md rounded-lg border-l-4 ${style.border} border border-gray-700/30 p-3 shadow-lg ${
        faded ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-bold ${style.icon}`}>{rec.icon}</span>
        <span className="text-xs font-medium text-white flex-1 truncate">
          {rec.title}
        </span>
        {timestamp && (
          <span className="text-[9px] text-gray-600 font-mono">{timestamp}</span>
        )}
        <span className="text-[9px] text-gray-500 bg-gray-800/50 px-1.5 py-0.5 rounded">
          {typeLabel}
        </span>
      </div>
      <p className="text-[11px] text-gray-300 leading-relaxed">{rec.detail}</p>
    </div>
  );
}
