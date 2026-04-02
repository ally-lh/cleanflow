// CleanFlow — Scheduling Engine
//
// Handles pickup and delivery slot availability.
// Currently uses ScheduleSlot table for capacity checks.
// Future: integrate with WorkerAvailability for driver assignment.

import { db } from "@/lib/db";
import type { TimeSlot } from "@/types";
import { PICKUP_TIME_SLOTS } from "@/types/constants";

export type ScheduleKind = "pickup" | "delivery";

const DEFAULT_SLOT_CAPACITY: Record<ScheduleKind, number> = {
  pickup: 3,
  delivery: 2,
};

// ──────────────────────────────────────────
// PUBLIC API
// ──────────────────────────────────────────

/**
 * Get available pickup or delivery time slots for a given date.
 * Returns all slots with remaining capacity info.
 */
export async function getAvailableSlots(
  date: Date,
  kind: ScheduleKind = "pickup"
): Promise<TimeSlot[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const [existingSlots, scheduledRequests] = await Promise.all([
    db.scheduleSlot.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
      },
    }),
    kind === "pickup"
      ? db.pickupRequest.findMany({
          where: {
            requestedDate: { gte: startOfDay, lte: endOfDay },
            status: { in: ["PENDING", "APPROVED"] },
          },
          select: { requestedSlot: true },
        })
      : db.deliveryRequest.findMany({
          where: {
            requestedDate: { gte: startOfDay, lte: endOfDay },
            status: { in: ["PENDING", "APPROVED"] },
          },
          select: { requestedSlot: true },
        }),
  ]);

  const slotMap = new Map(existingSlots.map((s) => [s.startTime, s]));
  const requestCountBySlot = new Map<string, number>();

  scheduledRequests.forEach((request) => {
    if (!request.requestedSlot) return;

    requestCountBySlot.set(
      request.requestedSlot,
      (requestCountBySlot.get(request.requestedSlot) ?? 0) + 1
    );
  });

  return PICKUP_TIME_SLOTS.map((template) => {
    const [start] = template.value.split("-");
    const dbSlot = slotMap.get(start);
    const requestCount = requestCountBySlot.get(template.value) ?? 0;

    if (dbSlot) {
      const bookedCount = Math.max(dbSlot.bookedCount, requestCount);
      const remaining = dbSlot.maxCapacity - bookedCount;
      return {
        value: template.value,
        label: template.label,
        available: remaining > 0 && dbSlot.status === "AVAILABLE",
        remainingCapacity: Math.max(0, remaining),
      };
    }

    // No DB entry = slot is fully open
    return {
      value: template.value,
      label: template.label,
      available: requestCount < DEFAULT_SLOT_CAPACITY[kind],
      remainingCapacity: Math.max(0, DEFAULT_SLOT_CAPACITY[kind] - requestCount),
    };
  });
}

/**
 * Book a pickup slot — increment the slot's bookedCount.
 * Creates the slot record if it doesn't exist yet.
 */
export async function bookPickupSlot(
  date: Date,
  slotValue: string
): Promise<void> {
  const [startTime, endTime] = slotValue.split("-");
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const slotLabel =
    PICKUP_TIME_SLOTS.find((s) => s.value === slotValue)?.label ?? slotValue;

  await db.scheduleSlot.upsert({
    where: {
      // Need a compound identifier — use a combo of date and startTime
      // In production, add @@unique([date, startTime]) to schema
      id: `${date.toISOString().split("T")[0]}-${startTime}`,
    },
    update: {
      bookedCount: { increment: 1 },
    },
    create: {
      id: `${date.toISOString().split("T")[0]}-${startTime}`,
      date: startOfDay,
      startTime,
      endTime,
      label: slotLabel,
      maxCapacity: 3,
      bookedCount: 1,
      status: "AVAILABLE",
    },
  });
}

/**
 * Release a previously booked slot (e.g. on cancellation).
 */
export async function releasePickupSlot(
  date: Date,
  slotValue: string
): Promise<void> {
  const [startTime] = slotValue.split("-");
  const slotId = `${date.toISOString().split("T")[0]}-${startTime}`;

  await db.scheduleSlot
    .update({
      where: { id: slotId },
      data: { bookedCount: { decrement: 1 } },
    })
    .catch(() => {
      // Slot might not exist — safe to ignore
    });
}

/**
 * Generate available dates (next 14 days, excluding Sundays).
 */
export function getAvailableDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0) {
      // Exclude Sundays
      dates.push(d);
    }
  }

  return dates;
}

/**
 * Format a date for display.
 */
export function formatSlotDate(date: Date): string {
  return date.toLocaleDateString("en-SG", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
