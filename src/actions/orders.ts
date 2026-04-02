"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { generateOrderNumber } from "@/lib/orders/orderNumber";
import { analyzeLaundryImage } from "@/lib/ai/analyzeLaundryImage";
import { enrichItemsWithPrices, calculatePriceBreakdown } from "@/lib/pricing/pricingEngine";
import { logOrderEvent, logStatusChange } from "@/lib/telemetry/orderEvents";
import { geocodePostalCode } from "@/lib/geo/geocoding";
import { getAvailableSlots, type ScheduleKind } from "@/lib/scheduling/schedulingEngine";
import type { ActionResult } from "./auth";
import type { EditableOrderItem, ConfirmOrderInput, TimeSlot } from "@/types";
import { ServiceType, OrderStatus, CollectionMethod, PickupMethod } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const PAYMENT_ELIGIBLE_ORDER_STATUSES: OrderStatus[] = [
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "RECEIVED_AT_STORE",
  "WASHING",
  "DRYING",
  "PRESSING_OR_FINISHING",
  "READY_FOR_COLLECTION",
  "OUT_FOR_DELIVERY",
];

const ADMIN_HIDDEN_ORDER_STATUSES: OrderStatus[] = [
  "DRAFT",
  "PHOTO_ANALYZED",
];

// ──────────────────────────────────────────
// CREATE DRAFT ORDER
// ──────────────────────────────────────────

const CreateOrderSchema = z.object({
  serviceType: z.nativeEnum(ServiceType),
  pickupMethod: z.nativeEnum(PickupMethod),
  specialNotes: z.string().optional(),
  addressId: z.string().optional(),
});

export async function createOrderAction(
  formData: FormData
): Promise<ActionResult<{ orderId: string }>> {
  const user = await requireAuth();

  const parsed = CreateOrderSchema.safeParse({
    serviceType: formData.get("serviceType"),
    pickupMethod: formData.get("pickupMethod"),
    specialNotes: formData.get("specialNotes") || undefined,
    addressId: formData.get("addressId") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const customerProfile = await db.customerProfile.findUnique({
    where: { userId: user.id },
  });

  if (!customerProfile) {
    return { success: false, error: "Customer profile not found." };
  }

  const orderNumber = await generateOrderNumber();

  const order = await db.order.create({
    data: {
      orderNumber,
      customerId: customerProfile.id,
      serviceType: parsed.data.serviceType,
      pickupMethod: parsed.data.pickupMethod,
      specialNotes: parsed.data.specialNotes,
      addressId: parsed.data.addressId,
      status: "DRAFT",
    },
  });

  await logStatusChange({ orderId: order.id, status: "DRAFT", changedBy: user.id });
  await logOrderEvent({
    orderId: order.id,
    userId: user.id,
    type: "ORDER_CREATED",
    message: `Order ${orderNumber} created.`,
  });

  revalidatePath("/dashboard");
  return { success: true, data: { orderId: order.id } };
}

// ──────────────────────────────────────────
// SUBMIT IMAGE & RUN AI ANALYSIS
// ──────────────────────────────────────────

export async function analyzeOrderImageAction(
  orderId: string,
  imageUrl: string,
  fileName: string
): Promise<ActionResult<{ analysisId: string; items: EditableOrderItem[] }>> {
  const user = await requireAuth();

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });

  if (!order || order.customer.userId !== user.id) {
    return { success: false, error: "Order not found." };
  }

  // Save the uploaded image record
  await db.uploadedImage.create({
    data: { orderId, url: imageUrl, fileName },
  });

  // Run AI analysis
  const result = await analyzeLaundryImage(imageUrl);

  // Enrich items with prices based on service type
  const rawItems: EditableOrderItem[] = result.detectedItems.map((item) => ({
    category: item.category,
    quantity: item.quantity,
    isAiDetected: true,
    confidence: item.confidence,
    unitPrice: 0, // will be enriched below
    totalPrice: 0,
  }));

  const enrichedItems = enrichItemsWithPrices(rawItems, order.serviceType);

  // Save AI analysis to DB
  const analysis = await db.aIAnalysis.create({
    data: {
      orderId,
      rawResult: result as object,
      totalEstimatedPieces: result.totalEstimatedPieces,
      detectedItemsSummary: result.detectedItemsSummary,
      previewWarnings: result.previewWarnings,
      modelUsed: result.modelUsed,
    },
  });

  // Update order status
  await db.order.update({
    where: { id: orderId },
    data: { status: "PHOTO_ANALYZED" },
  });

  await logStatusChange({ orderId, status: "PHOTO_ANALYZED", changedBy: user.id });

  revalidatePath(`/orders/${orderId}`);
  return { success: true, data: { analysisId: analysis.id, items: enrichedItems } };
}

// ──────────────────────────────────────────
// CONFIRM ORDER (after customer edits items)
// ──────────────────────────────────────────

export async function confirmOrderAction(
  input: ConfirmOrderInput
): Promise<ActionResult> {
  const user = await requireAuth();

  const order = await db.order.findUnique({
    where: { id: input.orderId },
    include: { customer: true },
  });

  if (!order || order.customer.userId !== user.id) {
    return { success: false, error: "Order not found." };
  }

  const isDelivery = input.collectionMethod === "DELIVERY";

  // Calculate estimated price
  const pricing = calculatePriceBreakdown(
    input.items,
    order.serviceType,
    isDelivery
  );

  // Replace all order items
  await db.orderItem.deleteMany({ where: { orderId: input.orderId } });
  await db.orderItem.createMany({
    data: input.items.map((item) => ({
      orderId: input.orderId,
      category: item.category as never,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      isAiDetected: item.isAiDetected,
      confidence: item.confidence,
    })),
  });

  // Upsert invoice
  await db.invoice.upsert({
    where: { orderId: input.orderId },
    update: {
      estimatedTotal: pricing.subtotal,
      deliveryFee: pricing.deliveryFee,
      finalTotal: pricing.total,
      status: "PENDING_VERIFICATION",
    },
    create: {
      orderId: input.orderId,
      estimatedTotal: pricing.subtotal,
      deliveryFee: pricing.deliveryFee,
      finalTotal: pricing.total,
      status: "PENDING_VERIFICATION",
    },
  });

  // Determine next status based on pickup method
  const nextStatus: OrderStatus =
    order.pickupMethod === "SCHEDULED_PICKUP"
      ? "PENDING_PICKUP_SCHEDULING"
      : "PENDING_CONFIRMATION";

  await db.order.update({
    where: { id: input.orderId },
    data: {
      status: nextStatus,
      collectionMethod: input.collectionMethod as CollectionMethod,
      specialNotes: input.specialNotes,
      confirmedAt: new Date(),
    },
  });

  // Mark AI analysis as confirmed
  await db.aIAnalysis.updateMany({
    where: { orderId: input.orderId },
    data: { customerConfirmed: true, customerConfirmedAt: new Date() },
  });

  await logStatusChange({ orderId: input.orderId, status: nextStatus, changedBy: user.id });
  await logOrderEvent({
    orderId: input.orderId,
    userId: user.id,
    type: "ORDER_CREATED",
    message: "Customer confirmed order items and collection method.",
  });

  revalidatePath(`/orders/${input.orderId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

// ──────────────────────────────────────────
// REQUEST PICKUP SCHEDULING
// ──────────────────────────────────────────

const PickupSchema = z.object({
  orderId: z.string(),
  addressId: z.string(),
  requestedDate: z.string(),
  requestedSlot: z.string(),
});

export async function requestPickupAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAuth();

  const parsed = PickupSchema.safeParse({
    orderId: formData.get("orderId"),
    addressId: formData.get("addressId"),
    requestedDate: formData.get("requestedDate"),
    requestedSlot: formData.get("requestedSlot"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { orderId, addressId, requestedDate, requestedSlot } = parsed.data;
  const requestedDateValue = new Date(requestedDate);

  if (Number.isNaN(requestedDateValue.getTime())) {
    return { success: false, error: "Please choose a valid date." };
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { customer: true, pickupRequest: true },
  });

  if (!order || order.customer.userId !== user.id) {
    return { success: false, error: "Order not found." };
  }

  const isUnchangedRequest =
    order.pickupRequest &&
    order.pickupRequest.requestedSlot === requestedSlot &&
    order.pickupRequest.requestedDate.toISOString().split("T")[0] === requestedDate;

  if (!isUnchangedRequest) {
    const availableSlots = await getAvailableSlots(requestedDateValue, "pickup");
    const selectedSlotAvailability = availableSlots.find(
      (slot) => slot.value === requestedSlot
    );

    if (!selectedSlotAvailability) {
      return { success: false, error: "That time slot is not available." };
    }

    if (!selectedSlotAvailability.available) {
      return {
        success: false,
        error: "That pickup slot is already full. Please choose another time.",
      };
    }
  }

  await db.pickupRequest.upsert({
    where: { orderId },
    update: {
      addressId,
      requestedDate: requestedDateValue,
      requestedSlot,
      status: "PENDING",
    },
    create: {
      orderId,
      addressId,
      requestedDate: requestedDateValue,
      requestedSlot,
      status: "PENDING",
    },
  });

  await db.order.update({
    where: { id: orderId },
    data: { status: "PENDING_PICKUP_SCHEDULING" },
  });

  await logStatusChange({
    orderId,
    status: "PENDING_PICKUP_SCHEDULING",
    changedBy: user.id,
    notes: `Requested slot: ${requestedSlot} on ${requestedDate}`,
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

// ──────────────────────────────────────────
// ADD / SAVE ADDRESS
// ──────────────────────────────────────────

const AddressSchema = z.object({
  label: z.string().optional(),
  streetLine1: z.string().min(1),
  streetLine2: z.string().optional(),
  city: z.string().min(1),
  postalCode: z.string().min(5),
  country: z.string().default("Singapore"),
  isDefault: z.boolean().default(false),
});

const SlotAvailabilitySchema = z.object({
  requestedDate: z.string().min(1),
  requestKind: z.enum(["pickup", "delivery"]).optional(),
});

export async function getAvailableTimeSlotsAction(
  input: z.infer<typeof SlotAvailabilitySchema>
): Promise<TimeSlot[]> {
  await requireAuth();

  const parsed = SlotAvailabilitySchema.safeParse(input);
  if (!parsed.success) {
    return [];
  }

  const date = new Date(parsed.data.requestedDate);
  if (Number.isNaN(date.getTime())) {
    return [];
  }

  return getAvailableSlots(
    date,
    (parsed.data.requestKind ?? "pickup") as ScheduleKind
  );
}

export async function saveAddressAction(
  formData: FormData
): Promise<ActionResult<{ addressId: string }>> {
  const user = await requireAuth();

  const parsed = AddressSchema.safeParse({
    label: formData.get("label") || undefined,
    streetLine1: formData.get("streetLine1"),
    streetLine2: formData.get("streetLine2") || undefined,
    city: formData.get("city"),
    postalCode: formData.get("postalCode"),
    country: formData.get("country") || "Singapore",
    isDefault: formData.get("isDefault") === "true",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const customerProfile = await db.customerProfile.findUnique({
    where: { userId: user.id },
  });

  if (!customerProfile) {
    return { success: false, error: "Customer profile not found." };
  }

  // Attempt to geocode the postal code (mock for prototype)
  const geo = await geocodePostalCode(parsed.data.postalCode);

  // If setting as default, unset all others
  if (parsed.data.isDefault) {
    await db.address.updateMany({
      where: { customerId: customerProfile.id },
      data: { isDefault: false },
    });
  }

  const address = await db.address.create({
    data: {
      customerId: customerProfile.id,
      ...parsed.data,
      lat: geo?.lat,
      lng: geo?.lng,
    },
  });

  revalidatePath("/profile");
  return { success: true, data: { addressId: address.id } };
}

// ──────────────────────────────────────────
// GET CUSTOMER ORDERS (for dashboard)
// ──────────────────────────────────────────

export async function getMyOrdersAction() {
  const user = await requireAuth();

  const customerProfile = await db.customerProfile.findUnique({
    where: { userId: user.id },
  });

  if (!customerProfile) return [];

  return db.order.findMany({
    where: { customerId: customerProfile.id },
    include: {
      items: true,
      invoice: true,
      pickupRequest: true,
      deliveryRequest: true,
      statusHistory: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteDraftOrderAction(
  orderId: string
): Promise<ActionResult> {
  const user = await requireAuth();

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });

  if (!order || order.customer.userId !== user.id) {
    return { success: false, error: "Order not found." };
  }

  if (order.status !== "DRAFT") {
    return { success: false, error: "Only draft orders can be deleted." };
  }

  await db.order.delete({
    where: { id: orderId },
  });

  revalidatePath("/dashboard");
  revalidatePath("/orders/new");
  revalidatePath("/profile/orders");

  return { success: true };
}

export async function payInvoiceAction(
  orderId: string
): Promise<ActionResult> {
  const user = await requireAuth();

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      invoice: true,
    },
  });

  if (!order || order.customer.userId !== user.id) {
    return { success: false, error: "Order not found." };
  }

  if (!order.invoice) {
    return { success: false, error: "Invoice not found." };
  }

  if (!PAYMENT_ELIGIBLE_ORDER_STATUSES.includes(order.status)) {
    return {
      success: false,
      error: "Payment is available after pickup has been scheduled.",
    };
  }

  if (order.invoice.status !== "CONFIRMED") {
    return {
      success: false,
      error: "Payment is available once the final invoice has been confirmed.",
    };
  }

  if (order.invoice.paidAt || order.invoice.status === "PAID") {
    return { success: false, error: "This invoice has already been paid." };
  }

  await db.invoice.update({
    where: { orderId },
    data: {
      status: "PAID",
      paidAt: new Date(),
    },
  });

  await logOrderEvent({
    orderId,
    userId: user.id,
    type: "GENERAL",
    message: "Customer payment recorded successfully.",
  });

  revalidatePath("/dashboard");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}

// ──────────────────────────────────────────
// GET SINGLE ORDER WITH FULL DETAILS
// ──────────────────────────────────────────

export async function getOrderDetailAction(orderId: string) {
  const user = await requireAuth();

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { include: { user: true } },
      address: true,
      items: true,
      uploadedImages: true,
      aiAnalysis: true,
      pickupRequest: { include: { address: true, driver: { include: { user: true } } } },
      deliveryRequest: { include: { address: true, driver: { include: { user: true } } } },
      invoice: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) return null;

  // Security: customers can only see their own orders; admins can see all
  const isOwner = order.customer.userId === user.id;
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  if (!isOwner && !isAdmin) return null;
  if (
    isAdmin &&
    !isOwner &&
    ADMIN_HIDDEN_ORDER_STATUSES.includes(order.status)
  ) {
    return null;
  }

  return order;
}
