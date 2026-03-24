import { readFile } from "fs/promises";
import path from "path";

import AnalyticsDashboardClient from "@/components/admin/analytics/AnalyticsDashboardClient";
import type { AnalyticsSnapshot } from "@/components/admin/analytics/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function loadSnapshot(): Promise<AnalyticsSnapshot | null> {
  const snapshotPath =
    process.env.ANALYTICS_SNAPSHOT_PATH ??
    path.join(process.cwd(), "python-analytics", "output", "analytics_snapshot.json");
  try {
    const raw = await readFile(snapshotPath, "utf-8");
    return JSON.parse(raw) as AnalyticsSnapshot;
  } catch {
    return null;
  }
}

export default async function AdminAnalyticsPage() {
  const snap = await loadSnapshot();

  if (!snap) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">No snapshot yet</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-950 space-y-2">
            <p>
              Generate data from the repo root (with the app running and{" "}
              <code className="bg-amber-100 px-1 rounded">ANALYTICS_API_KEY</code> set):
            </p>
            <pre className="bg-white p-3 rounded border text-xs overflow-x-auto">
              cd python-analytics{"\n"}
              python build_snapshot.py
            </pre>
            <p>
              Or re-run from a saved CSV:{" "}
              <code className="bg-amber-100 px-1 rounded">
                python build_snapshot.py --csv data/orders_....csv
              </code>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Generated {snap.generatedAt ? new Date(snap.generatedAt).toLocaleString() : "—"} ·{" "}
          {snap.source ?? "unknown source"} · {snap.sourceOrderCount ?? "—"} orders
        </p>
      </div>
      <AnalyticsDashboardClient snapshot={snap} />
    </div>
  );
}
