import type { PriceTier } from './public-api';
import { getTierForQuantity, formatTierLabel } from './price-utils';

export type CartAttributeValue = string | { value_id: string } | null | undefined;

export type SelectedAttributes = Record<string, {
  value_id: string;
  label: string;
  raw_value: string;
  price_modifier?: number;
  type_name?: string;
}>;

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
  selected_attributes?: SelectedAttributes;
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

export function getCartKey(productId: string, attributes?: Record<string, CartAttributeValue>): string {
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

export function sanitizeQuantity(qty: number): number {
  return Number.isFinite(qty) && qty >= 1 ? qty : 1;
}

export function sanitizePrice(p: number): number {
  return Number.isFinite(p) ? p : 0;
}

function getSurcharges(item: CartItem): number {
  if (!item.selected_attributes) return 0;
  return Object.values(item.selected_attributes).reduce((sum, attr) => {
    const mod = attr.price_modifier;
    return sum + (Number.isFinite(mod) ? (mod as number) : 0);
  }, 0);
}

export function getApplicableTier(item: CartItem): PriceTier | null {
  if (!item.price_tiers || item.price_tiers.length === 0) return null;
  return getTierForQuantity(item.price_tiers, sanitizeQuantity(item.quantity));
}

export function getEffectivePrice(item: CartItem): number {
  const surcharges = getSurcharges(item);

  let tierUnit: number;
  if (item.price_tiers && item.price_tiers.length > 0) {
    const tier = getApplicableTier(item);
    tierUnit = tier ? tier.price : sanitizePrice(item.price);
  } else {
    tierUnit = Number.isFinite(item.selected_tier_price)
      ? (item.selected_tier_price as number)
      : sanitizePrice(item.price);
  }

  return Math.max(0, tierUnit + surcharges);
}

export function getItemTotal(item: CartItem): number {
  return getEffectivePrice(item) * sanitizeQuantity(item.quantity);
}

export function getCartTierBadge(item: CartItem): { label: string; active: boolean } | null {
  if (!item.price_tiers || item.price_tiers.length === 0) return null;
  const tier = getApplicableTier(item);
  if (!tier) return null;
  const cheapestPrice = Math.min(...item.price_tiers.map((t) => t.price));
  return { label: formatTierLabel(tier), active: tier.price === cheapestPrice };
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

export function isHashKey(compositeKey: string | undefined): boolean {
  if (!compositeKey) return false;
  if (compositeKey.includes(':')) return false;
  const lastDash = compositeKey.lastIndexOf('-');
  if (lastDash === -1) return false;
  const suffix = compositeKey.slice(lastDash + 1);
  return /^[0-9a-f]{6,}$/.test(suffix);
}

export function migrateCart(cart: CartItem[]): CartItem[] {
  let changed = false;
  const migrated = cart.map((item) => {
    let next = item;

    const needsMigration = !item.composite_key || isHashKey(item.composite_key);
    if (needsMigration) {
      next = {
        ...next,
        composite_key: getCartKey(item.id, item.selected_attributes),
        price_tiers: item.price_tiers || [],
      };
    }

    const qty = sanitizeQuantity(next.quantity);
    if (qty !== next.quantity) {
      next = { ...next, quantity: qty };
    }

    if (next.price_tiers && next.price_tiers.length > 0) {
      const refreshed = reevalTier(next);
      if (
        refreshed.selected_tier_id !== next.selected_tier_id ||
        refreshed.selected_tier_price !== next.selected_tier_price ||
        refreshed.selected_tier_min_qty !== next.selected_tier_min_qty
      ) {
        next = refreshed;
      }
    }

    if (next !== item) changed = true;
    return next;
  });
  if (changed) {
    try {
      localStorage.setItem('cart', JSON.stringify(migrated));
    } catch { /* ignore in non-browser environments */ }
  }
  return migrated;
}
