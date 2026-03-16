// CleanFlow — Shared TypeScript Types
// Re-exports Prisma enums and defines app-level types

export type {
  User,
  CustomerProfile,
  AdminProfile,
  Driver,
  Address,
  Order,
  OrderItem,
  UploadedImage,
  AIAnalysis,
  PickupRequest,
  DeliveryRequest,
  ScheduleSlot,
  WorkerAvailability,
  PriceRule,
  Invoice,
  RouteEstimate,
  OrderStatusHistory,
  NotificationLog,
} from "@prisma/client";

export {
  UserRole,
  OrderStatus,
  CollectionMethod,
  ServiceType,
  ClothingCategory,
  PickupMethod,
  SlotStatus,
  ScheduleRequestStatus,
  InvoiceStatus,
  NotificationType,
} from "@prisma/client";

// ──────────────────────────────────────────
// AI ANALYSIS TYPES
// ──────────────────────────────────────────

export interface DetectedItem {
  category: string; // ClothingCategory value
  quantity: number;
  confidence: number; // 0–1
  label: string; // human-readable label
}

export interface AIAnalysisResult {
  detectedItems: DetectedItem[];
  totalEstimatedPieces: number;
  detectedItemsSummary: string;
  previewWarnings: string[];
  modelUsed: string;
}

// ──────────────────────────────────────────
// ORDER FORM TYPES
// ──────────────────────────────────────────

export interface CreateOrderInput {
  serviceType: string;
  pickupMethod: string;
  specialNotes?: string;
  addressId?: string;
}

export interface EditableOrderItem {
  id?: string; // undefined = new item
  category: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isAiDetected: boolean;
  confidence?: number;
}

export interface SchedulePickupInput {
  orderId: string;
  addressId: string;
  requestedDate: string; // ISO date string
  requestedSlot: string;
}

export interface ConfirmOrderInput {
  orderId: string;
  items: EditableOrderItem[];
  collectionMethod: string;
  specialNotes?: string;
}

// ──────────────────────────────────────────
// ADMIN TYPES
// ──────────────────────────────────────────

export interface AdminOrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  serviceType: string;
  itemCount: number;
  estimatedTotal: number;
  confirmedTotal?: number;
  createdAt: Date;
  pickupScheduled?: Date | null;
  collectionMethod?: string | null;
}

export interface AdminDashboardStats {
  totalOrders: number;
  pendingPickup: number;
  inProgress: number;
  readyForCollection: number;
  completedToday: number;
  pendingBillingConfirmation: number;
}

// ──────────────────────────────────────────
// PRICING TYPES
// ──────────────────────────────────────────

export interface PriceBreakdownItem {
  category: string;
  label: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PriceBreakdown {
  items: PriceBreakdownItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  currency: string;
  isEstimate: boolean;
}

// ──────────────────────────────────────────
// SCHEDULING TYPES
// ──────────────────────────────────────────

export interface TimeSlot {
  value: string; // "09:00-11:00"
  label: string; // "Morning (9am – 11am)"
  available: boolean;
  remainingCapacity: number;
}

// ──────────────────────────────────────────
// ORDER WITH FULL RELATIONS
// (used in UI — avoids re-declaring everywhere)
// ──────────────────────────────────────────

import type { Prisma } from "@prisma/client";

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    customer: { include: { user: true } };
    address: true;
    items: true;
    uploadedImages: true;
    aiAnalysis: true;
    pickupRequest: { include: { address: true; driver: true } };
    deliveryRequest: { include: { address: true; driver: true } };
    invoice: true;
    statusHistory: true;
  };
}>;

export type OrderListItem = Prisma.OrderGetPayload<{
  include: {
    customer: { include: { user: true } };
    items: true;
    invoice: true;
    pickupRequest: true;
  };
}>;
