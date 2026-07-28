import type { PriceTier } from './public-api';
import { getTierForQuantity, getTierPrice } from './price-utils';

export interface CartItem {
  id: string;
  composite_key?: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  price_tiers?: PriceTier[];
  selected_tier_id?: string;
  selected_tier_price?: number;
  selected_tier_min_qty?: number;
  selected_attributes?: Record<string, { value_id: string; label: string; raw_value: string; price_modifier?: number }>;
}

export function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

export function getCartKey(productId: string, attributes?: Record<string, any>): string {
  if (!attributes || Object.keys(attributes).length === 0) return productId;
  const sorted = Object.keys(attributes).sort().map(k => `${k}:${JSON.stringify(attributes[k])}`).join('|');
  return `${productId}-${djb2Hash(sorted)}`;
}

export function getEffectivePrice(item: CartItem): number {
  // If a tier price was already evaluated and stored, use it
  if (item.selected_tier_price != null) return item.selected_tier_price;
  // If tiers exist and quantity qualifies, compute the tier price
  if (item.price_tiers && item.price_tiers.length > 0) {
    const tierPrice = getTierPrice(item.price_tiers, item.quantity);
    // getTierPrice returns sorted[0].price when no tier matches qty.
    // If that's a volume tier (min_quantity > 1), fall back to item.price instead.
    if (tierPrice > 0) {
      const sorted = [...item.price_tiers].sort((a, b) => a.min_quantity - b.min_quantity);
      const noTierMatches = sorted.every((t) => t.min_quantity > item.quantity);
      if (noTierMatches) return item.price;
      return tierPrice;
    }
  }
  return item.price;
}

export function reevalTier(item: CartItem): CartItem {
  if (!item.price_tiers || item.price_tiers.length === 0) return item;

  const tier = getTierForQuantity(item.price_tiers, item.quantity);

  return {
    ...item,
    selected_tier_id: tier?.id,
    selected_tier_price: tier?.price ?? item.price,
    selected_tier_min_qty: tier?.min_quantity,
  };
}

export function migrateCart(cart: CartItem[]): CartItem[] {
  let changed = false;
  const migrated = cart.map((item: any) => {
    if (!item.composite_key) {
      changed = true;
      return {
        ...item,
        composite_key: getCartKey(item.id, item.selected_attributes),
        price_tiers: item.price_tiers || [],
      };
    }
    return item;
  });
  if (changed) {
    try {
      localStorage.setItem('cart', JSON.stringify(migrated));
      window.dispatchEvent(new Event('storage'));
    } catch { /* ignore in non-browser environments */ }
  }
  return migrated;
}
