/**
 * Price Utilities — Pure functions for volume pricing logic
 * 
 * These are pure functions with no side effects.
 * Used by VolumePriceBadge, VolumePriceSelector, PriceTierList, and cart integration.
 */

import type { PriceTier } from "./public-api";

/**
 * Returns the best volume tier for display badge.
 * Best = lowest price where min_quantity > 1
 * Returns null if no volume tiers exist (only base price tier)
 */
export function getBestVolumeBadge(tiers: PriceTier[]): PriceTier | null {
  if (!tiers || tiers.length === 0) return null;
  
  const volumeTiers = tiers.filter((t) => t.min_quantity > 1);
  if (volumeTiers.length === 0) return null;
  
  // Return the tier with the lowest price (highest discount)
  return volumeTiers.reduce((best, current) => 
    current.price < best.price ? current : best
  );
}

/**
 * Returns the applicable tier price for a given quantity.
 * Finds the tier with highest min_quantity <= qty.
 * Falls back to base price (min_quantity = 1) if qty < all tiers.
 */
export function getTierPrice(tiers: PriceTier[], qty: number): number {
  if (!tiers || tiers.length === 0) return 0;
  
  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  
  let applicablePrice = sorted[0].price; // base price
  
  for (const tier of sorted) {
    if (tier.min_quantity <= qty) {
      applicablePrice = tier.price;
    } else {
      break;
    }
  }
  
  return applicablePrice;
}

/**
 * Formats tier label for display: "Desde X unds: Gs. Y"
 */
export function formatTierLabel(tier: PriceTier): string {
  const formattedPrice = new Intl.NumberFormat("es-PY", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(tier.price);
  
  return `Desde ${tier.min_quantity} unds: Gs. ${formattedPrice}`;
}

/**
 * Calculates savings percentage vs base price (min_quantity = 1)
 */
export function getTierSavings(tier: PriceTier, tiers: PriceTier[]): number {
  if (!tier || !tiers || tiers.length === 0) return 0;
  
  const baseTier = tiers.find((t) => t.min_quantity === 1);
  if (!baseTier || baseTier.price === 0) return 0;
  
  const savings = ((baseTier.price - tier.price) / baseTier.price) * 100;
  return Math.round(savings);
}

/**
 * Gets the tier object for a given quantity
 */
export function getTierForQuantity(tiers: PriceTier[], qty: number): PriceTier | null {
  if (!tiers || tiers.length === 0) return null;
  
  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  let applicable: PriceTier | null = null;
  
  for (const tier of sorted) {
    if (tier.min_quantity <= qty) {
      applicable = tier;
    } else {
      break;
    }
  }
  
  return applicable;
}

/**
 * Checks if a tier is the "best" volume tier (lowest price with min_qty > 1)
 */
export function isBestVolumeTier(tier: PriceTier, tiers: PriceTier[]): boolean {
  const best = getBestVolumeBadge(tiers);
  return best?.id === tier.id;
}

/**
 * Formats tier option for select dropdown: "X+ unds — Gs. Y/u"
 */
export function formatTierOption(tier: PriceTier): string {
  const formattedPrice = new Intl.NumberFormat("es-PY", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(tier.price);
  
  return `${tier.min_quantity}+ unds — Gs. ${formattedPrice}/u`;
}