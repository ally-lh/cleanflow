// Generates human-readable order numbers like CF-2024-0042

import { db } from "@/lib/db";

function formatOrderNumber(year: number, sequence: number): string {
  return `CF-${year}-${String(sequence).padStart(4, "0")}`;
}

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CF-${year}-`;

  // Grab the most recent numbers for this year and continue from the highest
  // parsed suffix instead of total row count. Count-based generation collides
  // after deletions and under concurrent requests.
  const recentOrders = await db.order.findMany({
    where: {
      orderNumber: {
        startsWith: prefix,
      },
    },
    select: {
      orderNumber: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  let maxSequence = 0;
  for (const order of recentOrders) {
    const suffix = Number.parseInt(order.orderNumber.slice(prefix.length), 10);
    if (Number.isFinite(suffix)) {
      maxSequence = Math.max(maxSequence, suffix);
    }
  }

  return formatOrderNumber(year, maxSequence + 1);
}
