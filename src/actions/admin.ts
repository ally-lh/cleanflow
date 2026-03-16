"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { logStatusChange, logOrderEvent } from "@/lib/telemetry/orderEvents";
import type { ActionResult } from "./auth";
import type { AdminDashboardStats } from "@/types";
import { OrderStatus, ScheduleRequestStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ──────────────────────────────────────────
// DASHBOARD STATS
// ──────────────────────────────────────────

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  await requireAdmin();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalOrders,
    pendingPickup,
    inProgress,
    readyForCollection,
    completedToday,
    pendingBillingConfirmation,
  ] = await Promise.all([
    db.order.count(),
    db.order.count({
      where: { status: { in: ["PENDING_PICKUP_SCHEDULING", "PICKUP_SCHEDULED"] } },
    }),
    db.order.count({
      where: {
        status: {
          in: ["PICKED_UP", "RECEIVED_AT_STORE", "WASHING", "DRYING", "PRESSING_OR_FINISHING"],
        },
      },
    }),
    db.order.count({ where: { status: "READY_FOR_COLLECTION" } }),
    db.order.count({
      where: {
        completedAt: { gte: today, lt: tomorrow },
        status: "COMPLETED",
      },
    }),
    db.invoice.count({ where: { status: "PENDING_VERIFICATION" } }),
  ]);

  return {
    totalOrders,
    pendingPickup,
    inProgress,
    readyForCollection,
    completedToday,
    pendingBillingConfirmation,
  };
}

// ──────────────────────────────────────────
// GET ALL ORDERS (with filters)
// ──────────────────────────────────────────

export async function getAdminOrdersAction(filters?: {
  status?: OrderStatus;
  search?: string;
}) {
  await requireAdmin();

  return db.order.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.search
        ? {
            OR: [
              { orderNumber: { contains: filters.search, mode: "insensitive" } },
              {
                customer: {
                  user: { email: { contains: filters.search, mode: "insensitive" } },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      customer: { include: { user: true } },
      items: true,
      invoice: true,
      pickupRequest: { include: { driver: true } },
      deliveryRequest: { include: { driver: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ──────────────────────────────────────────
// UPDATE ORDER STATUS
// ──────────────────────────────────────────

const UpdateStatusSchema = z.object({
  orderId: z.string(),
  status: z.nativeEnum(OrderStatus),
  notes: z.string().optional(),
});

export async function updateOrderStatusAction(
  input: z.infer<typeof UpdateStatusSchema>
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = UpdateStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const updateData: Record<string, unknown> = { status: parsed.data.status };

  // Set timestamp fields based on status
  if (parsed.data.status === "PICKED_UP") updateData.pickedUpAt = new Date();
  if (parsed.data.status === "RECEIVED_AT_STORE") updateData.receivedAt = new Date();
  if (parsed.data.status === "COMPLETED") updateData.completedAt = new Date();

  await db.order.update({
    where: { id: parsed.data.orderId },
    data: updateData,
  });

  await logStatusChange({
    orderId: parsed.data.orderId,
    status: parsed.data.status,
    changedBy: admin.id,
    notes: parsed.data.notes,
  });

  await logOrderEvent({
    orderId: parsed.data.orderId,
    userId: admin.id,
    type: "ORDER_STATUS_CHANGED",
    message: `Status updated to ${parsed.data.status}${parsed.data.notes ? `: ${parsed.data.notes}` : ""}`,
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return { success: true };
}

// ──────────────────────────────────────────
// CONFIRM / ADJUST INVOICE
// ──────────────────────────────────────────

const ConfirmInvoiceSchema = z.object({
  orderId: z.string(),
  confirmedTotal: z.number().positive(),
  deliveryFee: z.number().min(0),
  notes: z.string().optional(),
});

export async function confirmInvoiceAction(
  input: z.infer<typeof ConfirmInvoiceSchema>
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = ConfirmInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const finalTotal =
    parsed.data.confirmedTotal + parsed.data.deliveryFee;

  await db.invoice.update({
    where: { orderId: parsed.data.orderId },
    data: {
      confirmedTotal: parsed.data.confirmedTotal,
      deliveryFee: parsed.data.deliveryFee,
      finalTotal,
      status: "CONFIRMED",
      confirmedAt: new Date(),
      notes: parsed.data.notes,
    },
  });

  await logOrderEvent({
    orderId: parsed.data.orderId,
    userId: admin.id,
    type: "INVOICE_READY",
    message: `Invoice confirmed. Final total: SGD ${finalTotal.toFixed(2)}`,
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return { success: true };
}

// ──────────────────────────────────────────
// APPROVE / REJECT PICKUP REQUEST
// ──────────────────────────────────────────

export async function approvePickupAction(
  pickupRequestId: string,
  driverId?: string
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const pickup = await db.pickupRequest.findUnique({
    where: { id: pickupRequestId },
    include: { order: true },
  });

  if (!pickup) return { success: false, error: "Pickup request not found." };

  await db.pickupRequest.update({
    where: { id: pickupRequestId },
    data: {
      status: ScheduleRequestStatus.APPROVED,
      driverId: driverId ?? null,
      scheduledAt: new Date(),
    },
  });

  await db.order.update({
    where: { id: pickup.orderId },
    data: { status: "PICKUP_SCHEDULED" },
  });

  await logStatusChange({
    orderId: pickup.orderId,
    status: "PICKUP_SCHEDULED",
    changedBy: admin.id,
    notes: `Pickup approved for ${pickup.requestedSlot} on ${pickup.requestedDate.toDateString()}`,
  });

  revalidatePath("/admin/schedule");
  revalidatePath("/admin/orders");
  return { success: true };
}

export async function rejectPickupAction(
  pickupRequestId: string,
  reason: string
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const pickup = await db.pickupRequest.findUnique({
    where: { id: pickupRequestId },
    include: { order: true },
  });

  if (!pickup) return { success: false, error: "Pickup request not found." };

  await db.pickupRequest.update({
    where: { id: pickupRequestId },
    data: { status: ScheduleRequestStatus.REJECTED, adminNotes: reason },
  });

  await db.order.update({
    where: { id: pickup.orderId },
    data: { status: "PENDING_CONFIRMATION" },
  });

  await logStatusChange({
    orderId: pickup.orderId,
    status: "PENDING_CONFIRMATION",
    changedBy: admin.id,
    notes: `Pickup rejected: ${reason}`,
  });

  revalidatePath("/admin/schedule");
  return { success: true };
}

// ──────────────────────────────────────────
// GET DRIVERS (for assignment)
// ──────────────────────────────────────────

export async function getActiveDriversAction() {
  await requireAdmin();
  return db.driver.findMany({
    where: { isActive: true },
    include: { user: true },
  });
}

// ──────────────────────────────────────────
// GET PENDING PICKUP REQUESTS
// ──────────────────────────────────────────

export async function getPendingPickupsAction() {
  await requireAdmin();
  return db.pickupRequest.findMany({
    where: { status: "PENDING" },
    include: {
      order: { include: { customer: { include: { user: true } }, invoice: true } },
      address: true,
      driver: { include: { user: true } },
    },
    orderBy: { requestedDate: "asc" },
  });
}
