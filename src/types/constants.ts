// CleanFlow — App-wide constants

import { ClothingCategory, OrderStatus, ServiceType } from "@prisma/client";

// ──────────────────────────────────────────
// CLOTHING CATEGORY LABELS
// ──────────────────────────────────────────

export const CLOTHING_CATEGORY_LABELS: Record<ClothingCategory, string> = {
  SHIRT: "Shirt / Blouse",
  PANTS: "Pants / Trousers",
  DRESS: "Dress",
  SUIT_JACKET: "Suit Jacket",
  SUIT_PANTS: "Suit Pants",
  COAT: "Coat / Jacket",
  SWEATER: "Sweater / Hoodie",
  SHORTS: "Shorts",
  SKIRT: "Skirt",
  UNDERWEAR: "Underwear",
  SOCKS: "Socks (pair)",
  BEDSHEET: "Bed Sheet",
  TOWEL: "Towel",
  CURTAIN: "Curtain",
  OTHER: "Other",
};

// ──────────────────────────────────────────
// ORDER STATUS LABELS & COLORS
// ──────────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  PHOTO_ANALYZED: "Photo Analyzed",
  PENDING_CONFIRMATION: "Pending Confirmation",
  PENDING_PICKUP_SCHEDULING: "Awaiting Pickup Schedule",
  PICKUP_SCHEDULED: "Pickup Scheduled",
  PICKED_UP: "Picked Up",
  RECEIVED_AT_STORE: "Received at Store",
  WASHING: "Washing",
  DRYING: "Drying",
  PRESSING_OR_FINISHING: "Pressing & Finishing",
  READY_FOR_COLLECTION: "Ready for Collection",
  OUT_FOR_DELIVERY: "Out for Delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUS_COLORS: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "secondary",
  PHOTO_ANALYZED: "secondary",
  PENDING_CONFIRMATION: "outline",
  PENDING_PICKUP_SCHEDULING: "outline",
  PICKUP_SCHEDULED: "default",
  PICKED_UP: "default",
  RECEIVED_AT_STORE: "default",
  WASHING: "default",
  DRYING: "default",
  PRESSING_OR_FINISHING: "default",
  READY_FOR_COLLECTION: "default",
  OUT_FOR_DELIVERY: "default",
  COMPLETED: "default",
  CANCELLED: "destructive",
};

// Customer-visible status steps for the order tracker
export const ORDER_STATUS_STEPS: OrderStatus[] = [
  "PENDING_CONFIRMATION",
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "RECEIVED_AT_STORE",
  "WASHING",
  "READY_FOR_COLLECTION",
  "COMPLETED",
];

// ──────────────────────────────────────────
// SERVICE TYPE LABELS
// ──────────────────────────────────────────

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  WASH_AND_FOLD: "Wash & Fold",
  DRY_CLEANING: "Dry Cleaning",
  IRONING_ONLY: "Ironing Only",
  WASH_AND_IRON: "Wash & Iron",
  EXPRESS: "Express (24h)",
};

// ──────────────────────────────────────────
// PICKUP TIME SLOTS
// ──────────────────────────────────────────

export const PICKUP_TIME_SLOTS = [
  { value: "09:00-11:00", label: "Morning (9am – 11am)" },
  { value: "11:00-13:00", label: "Late Morning (11am – 1pm)" },
  { value: "13:00-15:00", label: "Afternoon (1pm – 3pm)" },
  { value: "15:00-17:00", label: "Late Afternoon (3pm – 5pm)" },
  { value: "17:00-19:00", label: "Evening (5pm – 7pm)" },
] as const;

// ──────────────────────────────────────────
// DELIVERY FEE
// ──────────────────────────────────────────

export const DELIVERY_FEE_SGD = 5.0;
export const FREE_DELIVERY_THRESHOLD_SGD = 50.0;

// ──────────────────────────────────────────
// MISC
// ──────────────────────────────────────────

export const APP_NAME = "QT Laundry";
export const STORE_NAME = "QT Laundry Store";
export const STORE_ADDRESS = "123 Orchard Road, Singapore 238858";
export const CURRENCY = "SGD";
