// CleanFlow — Order Event Telemetry (Placeholder)
//
// Structured event logging for analytics pipeline.
// These events are designed so the Python analytics teammate can
// query the NotificationLog / OrderStatusHistory tables.
//
// Future: replace console.log with a real event sink
// (Segment, PostHog, custom Kafka topic, etc.)

import { db } from "@/lib/db";
import type { NotificationType, OrderStatus } from "@prisma/client";

export async function logOrderEvent(params: {
  orderId: string;
  userId?: string;
  type: NotificationType;
  message: string;
}): Promise<void> {
  await db.notificationLog.create({
    data: {
      orderId: params.orderId,
      userId: params.userId,
      type: params.type,
      channel: "in-app",
      message: params.message,
      delivered: true,
    },
  });
}

export async function logStatusChange(params: {
  orderId: string;
  status: OrderStatus;
  changedBy?: string;
  notes?: string;
}): Promise<void> {
  await db.orderStatusHistory.create({
    data: {
      orderId: params.orderId,
      status: params.status,
      changedBy: params.changedBy ?? "system",
      notes: params.notes,
    },
  });
}
