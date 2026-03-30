// CleanFlow — Pricing Engine
//
// Calculates order cost from item list and service type.
// Price rules are loaded from the database (PriceRule table).
// Fallback prices are defined here for prototype/offline use.

import type { PriceBreakdown, PriceBreakdownItem, EditableOrderItem } from "@/types";
import { ClothingCategory, ServiceType } from "@prisma/client";
import {
  CLOTHING_CATEGORY_LABELS,
  DELIVERY_FEE_SGD,
  FREE_DELIVERY_THRESHOLD_SGD,
  CURRENCY,
} from "@/types/constants";

export const BASE_ORDER_PRICE_SGD = 10;

// ──────────────────────────────────────────
// DEFAULT PRICES (SGD) — used if DB is unavailable
// ──────────────────────────────────────────

const DEFAULT_PRICES: Record<ClothingCategory, Record<ServiceType, number>> = {
  SHIRT:       { WASH_AND_FOLD: 2.5,  DRY_CLEANING: 5.0,  IRONING_ONLY: 2.0, WASH_AND_IRON: 4.0,  EXPRESS: 6.0  },
  PANTS:       { WASH_AND_FOLD: 3.0,  DRY_CLEANING: 7.0,  IRONING_ONLY: 2.5, WASH_AND_IRON: 5.0,  EXPRESS: 8.0  },
  DRESS:       { WASH_AND_FOLD: 4.0,  DRY_CLEANING: 10.0, IRONING_ONLY: 3.5, WASH_AND_IRON: 7.0,  EXPRESS: 12.0 },
  SUIT_JACKET: { WASH_AND_FOLD: 6.0,  DRY_CLEANING: 15.0, IRONING_ONLY: 4.0, WASH_AND_IRON: 10.0, EXPRESS: 18.0 },
  SUIT_PANTS:  { WASH_AND_FOLD: 4.0,  DRY_CLEANING: 10.0, IRONING_ONLY: 3.0, WASH_AND_IRON: 7.0,  EXPRESS: 12.0 },
  COAT:        { WASH_AND_FOLD: 8.0,  DRY_CLEANING: 20.0, IRONING_ONLY: 5.0, WASH_AND_IRON: 14.0, EXPRESS: 25.0 },
  SWEATER:     { WASH_AND_FOLD: 4.0,  DRY_CLEANING: 8.0,  IRONING_ONLY: 2.5, WASH_AND_IRON: 5.5,  EXPRESS: 10.0 },
  SHORTS:      { WASH_AND_FOLD: 2.5,  DRY_CLEANING: 5.0,  IRONING_ONLY: 2.0, WASH_AND_IRON: 4.0,  EXPRESS: 6.0  },
  SKIRT:       { WASH_AND_FOLD: 3.0,  DRY_CLEANING: 7.0,  IRONING_ONLY: 2.5, WASH_AND_IRON: 5.0,  EXPRESS: 8.0  },
  UNDERWEAR:   { WASH_AND_FOLD: 1.0,  DRY_CLEANING: 2.0,  IRONING_ONLY: 0.5, WASH_AND_IRON: 1.5,  EXPRESS: 2.5  },
  SOCKS:       { WASH_AND_FOLD: 0.5,  DRY_CLEANING: 1.0,  IRONING_ONLY: 0.5, WASH_AND_IRON: 1.0,  EXPRESS: 1.5  },
  BEDSHEET:    { WASH_AND_FOLD: 8.0,  DRY_CLEANING: 15.0, IRONING_ONLY: 5.0, WASH_AND_IRON: 12.0, EXPRESS: 18.0 },
  TOWEL:       { WASH_AND_FOLD: 4.0,  DRY_CLEANING: 7.0,  IRONING_ONLY: 2.0, WASH_AND_IRON: 5.0,  EXPRESS: 8.0  },
  CURTAIN:     { WASH_AND_FOLD: 12.0, DRY_CLEANING: 20.0, IRONING_ONLY: 8.0, WASH_AND_IRON: 15.0, EXPRESS: 25.0 },
  OTHER:       { WASH_AND_FOLD: 3.0,  DRY_CLEANING: 6.0,  IRONING_ONLY: 2.0, WASH_AND_IRON: 4.0,  EXPRESS: 7.0  },
};

// ──────────────────────────────────────────
// MAIN PRICING FUNCTION
// ──────────────────────────────────────────

/**
 * Calculate a full price breakdown from an item list.
 * Pass isDelivery=true to include the delivery fee.
 *
 * @param items - Array of order items with quantity and category
 * @param serviceType - Service type for pricing lookup
 * @param isDelivery - Whether delivery is requested
 * @param customPrices - Optional override prices from DB (PriceRule records)
 */
export function calculatePriceBreakdown(
  items: EditableOrderItem[],
  serviceType: ServiceType,
  isDelivery: boolean,
  customPrices?: Partial<Record<ClothingCategory, number>>
): PriceBreakdown {
  const breakdownItems: PriceBreakdownItem[] = items
    .filter((item) => item.quantity > 0)
    .map((item) => {
      const category = item.category as ClothingCategory;
      const unitPrice =
        customPrices?.[category] ??
        (item.unitPrice || (DEFAULT_PRICES[category]?.[serviceType] ?? 3.0));

      const lineTotal = parseFloat((unitPrice * item.quantity).toFixed(2));

      return {
        category: item.category,
        label: CLOTHING_CATEGORY_LABELS[category] ?? item.category,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      };
    });

  const itemsTotal = breakdownItems.reduce((sum, i) => sum + i.lineTotal, 0);
  const hasItems = breakdownItems.length > 0;
  const baseFee = hasItems ? BASE_ORDER_PRICE_SGD : 0;
  const subtotal = parseFloat((baseFee + itemsTotal).toFixed(2));

  // Delivery fee logic: free if order exceeds threshold
  const deliveryFee = isDelivery
    ? subtotal >= FREE_DELIVERY_THRESHOLD_SGD
      ? 0
      : DELIVERY_FEE_SGD
    : 0;

  const total = parseFloat((subtotal + deliveryFee).toFixed(2));

  return {
    items: breakdownItems,
    baseFee,
    subtotal,
    deliveryFee,
    discount: 0,
    total,
    currency: CURRENCY,
    isEstimate: true,
  };
}

/**
 * Get the unit price for a single clothing category and service type.
 */
export function getUnitPrice(
  category: ClothingCategory,
  serviceType: ServiceType
): number {
  return DEFAULT_PRICES[category]?.[serviceType] ?? 3.0;
}

/**
 * Enrich order items with unit prices based on the service type.
 * Call this after AI analysis to pre-fill prices.
 */
export function enrichItemsWithPrices(
  items: EditableOrderItem[],
  serviceType: ServiceType
): EditableOrderItem[] {
  return items.map((item) => {
    const unitPrice = getUnitPrice(
      item.category as ClothingCategory,
      serviceType
    );
    return {
      ...item,
      unitPrice,
      totalPrice: parseFloat((unitPrice * item.quantity).toFixed(2)),
    };
  });
}
