import type { PriceTier } from "./public-api";
import { formatPrice } from "./format";

export function getBestVolumeBadge(tiers: PriceTier[]): PriceTier | null {
  if (!tiers || tiers.length === 0) return null;

  const volumeTiers = tiers.filter((t) => t.min_quantity > 1);
  if (volumeTiers.length === 0) return null;

  return volumeTiers.reduce((best, current) =>
    current.price < best.price ? current : best
  );
}

export function getVolumeTierCount(tiers: PriceTier[]): number {
  if (!tiers || tiers.length === 0) return 0;

  return tiers.filter((t) => t.min_quantity > 1).length;
}

export function getTierPrice(tiers: PriceTier[], qty: number, fallbackPrice = 0): number {
  if (!tiers || tiers.length === 0) return fallbackPrice;

  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);

  let applicablePrice: number | null = null;

  for (const tier of sorted) {
    if (tier.min_quantity <= qty) {
      applicablePrice = tier.price;
    } else {
      break;
    }
  }

  return applicablePrice ?? fallbackPrice;
}

export function formatTierLabel(tier: PriceTier): string {
  return `Desde ${tier.min_quantity} unds: Gs. ${formatPrice(tier.price)}`;
}

export function getTierSavings(tier: PriceTier, tiers: PriceTier[]): number {
  if (!tier || !tiers || tiers.length === 0) return 0;

  const baseTier = tiers.find((t) => t.min_quantity === 1);
  if (!baseTier || baseTier.price === 0) return 0;

  const savings = ((baseTier.price - tier.price) / baseTier.price) * 100;
  return Math.round(savings);
}

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

export function isBestVolumeTier(tier: PriceTier, tiers: PriceTier[]): boolean {
  const best = getBestVolumeBadge(tiers);
  return best?.id === tier.id;
}

export function formatTierOption(tier: PriceTier): string {
  return `${tier.min_quantity}+ unds — Gs. ${formatPrice(tier.price)}/u`;
}
