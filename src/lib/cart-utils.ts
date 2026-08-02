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
  selected_attributes?: Record<string, { value_id: string; label: string; raw_value: string; price_modifier?: number; type_name?: string }>;
}

function escapeKeySegment(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/~/g, '\\~').replace(/=/g, '\\=');
}

function unescapeKeySegment(s: string): string {
  return s.replace(/\\=/g, '=').replace(/\\~/g, '~').replace(/\\:/g, ':').replace(/\\\\/g, '\\');
}

function escapeForMatch(s: string): string {
  return escapeKeySegment(s);
}

function parseEscapedPairs(segment: string): string[] {
  const pairs: string[] = [];
  let current = '';
  let i = 0;
  while (i < segment.length) {
    if (segment[i] === '\\' && i + 1 < segment.length) {
      current += segment[i] + segment[i + 1];
      i += 2;
    } else if (segment[i] === '~') {
      pairs.push(current);
      current = '';
      i++;
    } else {
      current += segment[i];
      i++;
    }
  }
  if (current) pairs.push(current);
  return pairs;
}

function findUnescapedColon(s: string): number {
  let i = 0;
  while (i < s.length) {
    if (s[i] === '\\' && i + 1 < s.length) {
      i += 2;
    } else if (s[i] === ':') {
      return i;
    } else {
      i++;
    }
  }
  return -1;
}

export function getCartKey(productId: string, attributes?: Record<string, any>): string {
  if (!attributes || Object.keys(attributes).length === 0) return escapeKeySegment(productId);
  const parts = Object.keys(attributes)
    .sort()
    .map(k => {
      const v = attributes[k];
      const valueId = typeof v === 'object' && v !== null ? v.value_id : v;
      return valueId ? `${escapeKeySegment(k)}=${escapeKeySegment(String(valueId))}` : null;
    })
    .filter(Boolean);
  return parts.length > 0 ? `${escapeKeySegment(productId)}:${parts.join('~')}` : escapeKeySegment(productId);
}

export function hasAttribute(compositeKey: string, moduleId: string): boolean {
  const idx = findUnescapedColon(compositeKey);
  if (idx === -1) return false;
  const segment = compositeKey.slice(idx + 1);
  return parseEscapedPairs(segment).some(p => p.startsWith(`${escapeForMatch(moduleId)}=`));
}

export function getAttributeValue(compositeKey: string, moduleId: string): string | null {
  const idx = findUnescapedColon(compositeKey);
  if (idx === -1) return null;
  const segment = compositeKey.slice(idx + 1);
  const prefix = `${escapeForMatch(moduleId)}=`;
  for (const p of parseEscapedPairs(segment)) {
    if (p.startsWith(prefix)) return unescapeKeySegment(p.slice(prefix.length));
  }
  return null;
}

function getSurcharges(item: CartItem): number {
  if (!item.selected_attributes) return 0;
  return Object.values(item.selected_attributes).reduce((sum, attr) => {
    return sum + (attr.price_modifier || 0);
  }, 0);
}

export function getEffectivePrice(item: CartItem): number {
  const surcharges = getSurcharges(item);

  // If a tier price was already evaluated and stored, use it + surcharges
  if (item.selected_tier_price != null) return item.selected_tier_price + surcharges;

  // If tiers exist and quantity qualifies, compute the tier price + surcharges
  if (item.price_tiers && item.price_tiers.length > 0) {
    const tierPrice = getTierPrice(item.price_tiers, item.quantity, item.price);
    if (tierPrice > 0) {
      const sorted = [...item.price_tiers].sort((a, b) => a.min_quantity - b.min_quantity);
      const noTierMatches = sorted.every((t) => t.min_quantity > item.quantity);
      if (noTierMatches) return item.price;
      return tierPrice + surcharges;
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
    selected_tier_price: tier?.price ?? undefined,
    selected_tier_min_qty: tier?.min_quantity,
  };
}

export function isHashKey(compositeKey: string): boolean {
  if (!compositeKey) return false;
  if (compositeKey.includes(':')) return false;
  const lastDash = compositeKey.lastIndexOf('-');
  if (lastDash === -1) return false;
  const suffix = compositeKey.slice(lastDash + 1);
  return /^[0-9a-f]{6,}$/.test(suffix);
}

export function migrateCart(cart: CartItem[]): CartItem[] {
  let changed = false;
  const migrated = cart.map((item: any) => {
    const needsMigration = !item.composite_key || isHashKey(item.composite_key);
    if (needsMigration) {
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
    } catch { /* ignore in non-browser environments */ }
  }
  return migrated;
}
