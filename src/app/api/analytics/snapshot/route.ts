import { readFile } from "fs/promises";
import path from "path";

import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/auth/session";
import { NextResponse } from "next/server";

/**
 * Returns the latest analytics snapshot JSON (written by python-analytics/build_snapshot.py).
 * Admin-only — same data as shown on /admin/analytics.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshotPath =
    process.env.ANALYTICS_SNAPSHOT_PATH ??
    path.join(process.cwd(), "python-analytics", "output", "analytics_snapshot.json");

  try {
    const raw = await readFile(snapshotPath, "utf-8");
    return NextResponse.json(JSON.parse(raw) as unknown);
  } catch {
    return NextResponse.json(
      {
        error: "Snapshot not found",
        hint: "Run: cd python-analytics && python build_snapshot.py",
      },
      { status: 404 }
    );
  }
}
