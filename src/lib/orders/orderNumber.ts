// Generates human-readable order numbers like CF-2024-0042

import { db } from "@/lib/db";

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.order.count();
  const seq = String(count + 1).padStart(4, "0");
  return `CF-${year}-${seq}`;
}
