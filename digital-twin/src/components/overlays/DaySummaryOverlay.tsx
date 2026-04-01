import type { DaySummary } from "../../lib/simTypes";

interface Props {
  summary: DaySummary;
  dayCount: number;
  onStartNextDay: () => void;
}

export default function DaySummaryOverlay({ summary, dayCount, onStartNextDay }: Props) {
  return (
    <div className="absolute inset-0 z-[2000] flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto bg-gray-900/90 backdrop-blur-lg rounded-2xl border border-gray-700/50 shadow-2xl p-8 max-w-sm w-full mx-4">
        <div className="text-center mb-6">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Day {dayCount + 1} Complete</div>
          <h2 className="text-xl font-bold text-white">End of Day Summary</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Stat label="Collected" value={`${summary.collected}/${summary.totalCollections}`} color="text-amber-400" />
          <Stat label="Delivered" value={`${summary.delivered}/${summary.totalDeliveries}`} color="text-cyan-400" />
          <Stat
            label="On-Time"
            value={`${summary.onTimePercent.toFixed(0)}%`}
            color={summary.onTimePercent >= 90 ? "text-green-400" : summary.onTimePercent >= 70 ? "text-amber-400" : "text-red-400"}
          />
          <Stat
            label="Late"
            value={summary.lateCount.toString()}
            color={summary.lateCount > 0 ? "text-red-400" : "text-green-400"}
          />
        </div>

        {summary.processing > 0 && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-6 text-center">
            <div className="text-[10px] uppercase text-purple-400 mb-0.5">Processing Overnight</div>
            <div className="text-lg font-bold text-purple-300">{summary.processing} orders</div>
            <div className="text-[10px] text-gray-500">Will be ready for delivery tomorrow</div>
          </div>
        )}

        <button
          onClick={onStartNextDay}
          className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Start Day {dayCount + 2}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}
