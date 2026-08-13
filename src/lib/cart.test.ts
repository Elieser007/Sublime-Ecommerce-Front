import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCart,
  addToCart,
  addToCartWithOptions,
  getCartCount,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  formatPrice,
  MAX_QUANTITY,
} from './cart';
import { getCartKey, hasAttribute, getAttributeValue, getEffectivePrice, getApplicableTier, getItemTotal, getCartTierBadge, sanitizeQuantity, reevalTier, migrateCart, isHashKey } from './cart-utils';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] || null),
  };
})();

// Mock window.dispatchEvent
const dispatchEventMock = vi.fn();
Object.defineProperty(globalThis, 'window', {
  value: {
    dispatchEvent: dispatchEventMock,
    addEventListener: vi.fn(),
  },
  writable: true,
});

// Mock localStorage on globalThis
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('cart-utils', () => {
  describe('getCartKey', () => {
    it('returns productId when no attributes', () => {
      expect(getCartKey('123')).toBe('123');
    });

    it('returns productId when attributes is empty', () => {
      expect(getCartKey('123', {})).toBe('123');
    });

    it('formats single attribute as productId:moduleId=valueId', () => {
      expect(getCartKey('prod-1', { color: 'negro' })).toBe('prod-1:color=negro');
    });

    it('formats multiple attributes with alphabetical moduleId order', () => {
      const key = getCartKey('prod-1', { size: 's', color: 'negro' });
      expect(key).toBe('prod-1:color=negro~size=s');
    });

    it('handles object attributes extracting value_id', () => {
      const attrs = {
        'mod-color': { value_id: 'v-negro', label: 'Negro', raw_value: 'negro' },
        'mod-size': { value_id: 'v-s', label: 'S', raw_value: 'S' },
      };
      const key = getCartKey('prod-abc', attrs);
      expect(key).toBe('prod-abc:mod-color=v-negro~mod-size=v-s');
    });

    it('produces same key for same attributes regardless of insertion order', () => {
      const key1 = getCartKey('prod-1', { b: '2', a: '1' });
      const key2 = getCartKey('prod-1', { a: '1', b: '2' });
      expect(key1).toBe(key2);
    });

    it('produces different keys for different attribute values', () => {
      const key1 = getCartKey('prod-1', { color: 'negro' });
      const key2 = getCartKey('prod-1', { color: 'blanco' });
      expect(key1).not.toBe(key2);
    });

    it('produces different keys for different product IDs', () => {
      const key1 = getCartKey('prod-1', { color: 'negro' });
      const key2 = getCartKey('prod-2', { color: 'negro' });
      expect(key1).not.toBe(key2);
    });

    it('skips attributes with null value_id', () => {
      const key = getCartKey('prod-1', { color: 'negro', size: null });
      expect(key).toBe('prod-1:color=negro');
    });

    it('returns productId when all attributes have null value_id', () => {
      expect(getCartKey('prod-1', { color: null, size: null })).toBe('prod-1');
    });

    it('escapes colon in productId', () => {
      expect(getCartKey('prod:1')).toBe('prod\\:1');
    });

    it('escapes tilde in productId', () => {
      expect(getCartKey('prod~1')).toBe('prod\\~1');
    });

    it('escapes equals in productId', () => {
      expect(getCartKey('prod=1')).toBe('prod\\=1');
    });

    it('escapes separator chars in attribute key and value', () => {
      const key = getCartKey('prod-1', { 'mod:1': 'val~2=3' });
      expect(key).toBe('prod-1:mod\\:1=val\\~2\\=3');
    });

    it('escapes separator chars in object attribute value_id', () => {
      const attrs = { 'mod:color': { value_id: 'v:1~2', label: 'X', raw_value: 'x' } };
      const key = getCartKey('prod-1', attrs);
      expect(key).toBe('prod-1:mod\\:color=v\\:1\\~2');
    });

    it('roundtrips keys with escaped separator characters', () => {
      const key = getCartKey('prod:1', { 'mod~1': 'val=2' });
      expect(hasAttribute(key, 'mod~1')).toBe(true);
      expect(getAttributeValue(key, 'mod~1')).toBe('val=2');
    });
  });

  describe('hasAttribute', () => {
    it('returns true when moduleId exists in key', () => {
      expect(hasAttribute('prod-1:color=negro~size=s', 'color')).toBe(true);
    });

    it('returns false when moduleId is not in key', () => {
      expect(hasAttribute('prod-1:color=negro', 'size')).toBe(false);
    });

    it('returns false for productId-only key (no colon)', () => {
      expect(hasAttribute('prod-1', 'color')).toBe(false);
    });

    it('handles single attribute key', () => {
      expect(hasAttribute('prod-1:color=negro', 'color')).toBe(true);
    });

    it('matches moduleId with special characters', () => {
      const key = getCartKey('prod-1', { 'mod:1': 'val' });
      expect(hasAttribute(key, 'mod:1')).toBe(true);
    });
  });

  describe('getAttributeValue', () => {
    it('returns value for matching moduleId', () => {
      expect(getAttributeValue('prod-1:color=negro~size=s', 'color')).toBe('negro');
    });

    it('returns null when moduleId is not in key', () => {
      expect(getAttributeValue('prod-1:color=negro', 'size')).toBeNull();
    });

    it('returns null for productId-only key', () => {
      expect(getAttributeValue('prod-1', 'color')).toBeNull();
    });

    it('handles values with hyphens', () => {
      expect(getAttributeValue('prod-1:mod=v-abc-def', 'mod')).toBe('v-abc-def');
    });

    it('returns unescaped value with special characters', () => {
      const key = getCartKey('prod-1', { 'mod:1': 'val~2=3' });
      expect(getAttributeValue(key, 'mod:1')).toBe('val~2=3');
    });
  });

  describe('getEffectivePrice', () => {
    it('returns selected_tier_price when set', () => {
      const item = { id: '1', name: 'A', price: 100, image: 'x', quantity: 1, selected_tier_price: 80 } as any;
      expect(getEffectivePrice(item)).toBe(80);
    });

    it('computes tier price from price_tiers when no selected_tier_price', () => {
      const tiers = [
        { id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 1, price: 100 },
        { id: 't2', branch_id: 'b1', branch_name: 'B', min_quantity: 10, price: 80 },
      ];
      const item = { id: '1', name: 'A', price: 100, image: 'x', quantity: 15, price_tiers: tiers } as any;
      expect(getEffectivePrice(item)).toBe(80);
    });

    it('falls back to base price when no tiers', () => {
      const item = { id: '1', name: 'A', price: 100, image: 'x', quantity: 1 } as any;
      expect(getEffectivePrice(item)).toBe(100);
    });

    it('adds surcharges exactly once on top of a pure tier price (D4)', () => {
      const tiers = [
        { id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 1, price: 20000 },
        { id: 't2', branch_id: 'b1', branch_name: 'B', min_quantity: 24, price: 17000 },
      ];
      const item = {
        id: '1', name: 'A', price: 20000, image: 'x', quantity: 24, price_tiers: tiers,
        selected_tier_id: 't2', selected_tier_price: 17000, selected_tier_min_qty: 24,
        selected_attributes: { 'mod-size': { value_id: 'v-s', label: 'S', raw_value: 'S', price_modifier: 1000 } },
      } as any;
      expect(getEffectivePrice(item)).toBe(18000);
    });

    it('does not double-count surcharges when item.price already includes them (D4)', () => {
      const tiers = [
        { id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 1, price: 20000 },
        { id: 't2', branch_id: 'b1', branch_name: 'B', min_quantity: 24, price: 17000 },
      ];
      // OLD add paths stored item.price = tier + surcharges; effective must stay tier + surcharges once
      const item = {
        id: '1', name: 'A', price: 18000, image: 'x', quantity: 24, price_tiers: tiers,
        selected_tier_id: 't2', selected_tier_price: 17000, selected_tier_min_qty: 24,
        selected_attributes: { 'mod-size': { value_id: 'v-s', label: 'S', raw_value: 'S', price_modifier: 1000 } },
      } as any;
      expect(getEffectivePrice(item)).toBe(18000);
      expect(getEffectivePrice(item)).not.toBe(19000);
    });

    it('stores pure base price and pure tier price (D4 add contract)', () => {
      const tiers = [
        { id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 1, price: 20000 },
        { id: 't2', branch_id: 'b1', branch_name: 'B', min_quantity: 24, price: 17000 },
      ];
      const result = addToCartWithOptions({
        id: '1', name: 'A', price: 20000, image: 'a.webp', quantity: 24, price_tiers: tiers,
        selected_tier_id: 't2', selected_tier_price: 17000, selected_tier_min_qty: 24,
      });
      expect(result[0].price).toBe(20000);
      expect(result[0].selected_tier_price).toBe(17000);
    });
  });

  describe('sanitizeQuantity', () => {
    it('maps NaN, zero and negatives to 1', () => {
      expect(sanitizeQuantity(NaN)).toBe(1);
      expect(sanitizeQuantity(0)).toBe(1);
      expect(sanitizeQuantity(-2)).toBe(1);
    });

    it('keeps fractional and whole positive quantities', () => {
      expect(sanitizeQuantity(2.5)).toBe(2.5);
      expect(sanitizeQuantity(3)).toBe(3);
    });
  });

  describe('getEffectivePrice (recompute-first)', () => {
    it('ignores stale selected_tier_price when tiers exist (recompute from qty)', () => {
      const tiers = [
        { id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 1, price: 100 },
        { id: 't2', branch_id: 'b1', branch_name: 'B', min_quantity: 10, price: 80 },
      ];
      const item = {
        id: '1', name: 'A', price: 100, image: 'x', quantity: 15, price_tiers: tiers,
        selected_tier_id: 't2', selected_tier_price: 17000, selected_tier_min_qty: 10,
      } as any;
      expect(getEffectivePrice(item)).toBe(80);
    });

    it('clamps negative results at 0 (base 5000 - mod 6000)', () => {
      const item = {
        id: '1', name: 'A', price: 5000, image: 'x', quantity: 1,
        selected_attributes: { 'mod-size': { value_id: 'v-s', label: 'S', raw_value: 'S', price_modifier: -6000 } },
      } as any;
      expect(getEffectivePrice(item)).toBe(0);
      expect(getItemTotal(item)).toBe(0);
    });

    it('falls back to base price plus modifiers when quantity is below all tier minimums', () => {
      const tiers = [
        { id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 10, price: 18000 },
      ];
      const item = {
        id: '1', name: 'A', price: 20000, image: 'x', quantity: 2, price_tiers: tiers,
        selected_attributes: { 'mod-size': { value_id: 'v-s', label: 'S', raw_value: 'S', price_modifier: 1000 } },
      } as any;
      expect(getEffectivePrice(item)).toBe(21000);
    });

    it('adds modifiers to the stored base price when no tiers exist', () => {
      const item = {
        id: '1', name: 'A', price: 20000, image: 'x', quantity: 2,
        selected_attributes: { 'mod-size': { value_id: 'v-s', label: 'S', raw_value: 'S', price_modifier: 1000 } },
      } as any;
      expect(getEffectivePrice(item)).toBe(21000);
    });

    it('returns 0 when price is missing or not finite', () => {
      const item = { id: '1', name: 'A', image: 'x', quantity: 1 } as any;
      expect(getEffectivePrice(item)).toBe(0);
    });

    it('keeps unit unchanged when an attribute modifier is zero (tier 17000 + mod 0)', () => {
      const tiers = [
        { id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 1, price: 17000 },
      ];
      const item = {
        id: '1', name: 'A', price: 17000, image: 'x', quantity: 1, price_tiers: tiers,
        selected_attributes: { 'mod-size': { value_id: 'v-s', label: 'S', raw_value: 'S', price_modifier: 0 } },
      } as any;
      expect(getEffectivePrice(item)).toBe(17000);
    });

    it('keeps in-range negative modifiers (tier 17000 - mod 500 = 16500)', () => {
      const tiers = [
        { id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 1, price: 17000 },
      ];
      const item = {
        id: '1', name: 'A', price: 17000, image: 'x', quantity: 1, price_tiers: tiers,
        selected_attributes: { 'mod-size': { value_id: 'v-s', label: 'S', raw_value: 'S', price_modifier: -500 } },
      } as any;
      expect(getEffectivePrice(item)).toBe(16500);
      expect(getItemTotal(item)).toBe(16500);
    });
  });

  describe('getApplicableTier', () => {
    it('returns null when no price_tiers', () => {
      const item = { id: '1', name: 'A', price: 100, image: 'x', quantity: 5 } as any;
      expect(getApplicableTier(item)).toBeNull();
    });

    it('returns null when quantity is below all tier minimums', () => {
      const tiers = [
        { id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 10, price: 18000 },
      ];
      const item = { id: '1', name: 'A', price: 20000, image: 'x', quantity: 2, price_tiers: tiers } as any;
      expect(getApplicableTier(item)).toBeNull();
    });

    it('returns the applicable tier by quantity (2 and 15)', () => {
      const tiers = [
        { id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 1, price: 120000 },
        { id: 't2', branch_id: 'b1', branch_name: 'B', min_quantity: 15, price: 100000 },
      ];
      const qty2 = { id: '1', name: 'A', price: 120000, image: 'x', quantity: 2, price_tiers: tiers } as any;
      expect(getApplicableTier(qty2)?.id).toBe('t1');

      const qty15 = { id: '1', name: 'A', price: 120000, image: 'x', quantity: 15, price_tiers: tiers } as any;
      expect(getApplicableTier(qty15)?.id).toBe('t2');
    });
  });

  describe('getItemTotal', () => {
    it('multiplies unit price by quantity', () => {
      const tiers = [
        { id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 1, price: 100 },
        { id: 't2', branch_id: 'b1', branch_name: 'B', min_quantity: 10, price: 80 },
      ];
      const item = { id: '1', name: 'A', price: 100, image: 'x', quantity: 15, price_tiers: tiers } as any;
      expect(getItemTotal(item)).toBe(1200); // 80 x 15
    });

    it('treats invalid quantity 0 as 1', () => {
      const item = { id: '1', name: 'A', price: 100, image: 'x', quantity: 0 } as any;
      expect(getItemTotal(item)).toBe(100);
    });

    it('recomputes unit and total from live quantity (qty 24 -> 1: unit 20000, total 20000)', () => {
      const tiers = [
        { id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 1, price: 20000 },
        { id: 't2', branch_id: 'b1', branch_name: 'B', min_quantity: 24, price: 17000 },
      ];
      const qty24 = { id: '1', name: 'A', price: 20000, image: 'x', quantity: 24, price_tiers: tiers } as any;
      expect(getEffectivePrice(qty24)).toBe(17000);
      expect(getItemTotal(qty24)).toBe(408000); // 17000 x 24

      const qty1 = { ...qty24, quantity: 1 };
      expect(getEffectivePrice(qty1)).toBe(20000);
      expect(getItemTotal(qty1)).toBe(20000);
    });
  });

  describe('getCartTierBadge', () => {
    const tiers = [
      { id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 1, price: 120000 },
      { id: 't2', branch_id: 'b1', branch_name: 'B', min_quantity: 15, price: 100000 },
    ];

    it('shows the applicable base tier, not active, at qty 2', () => {
      const item = { id: '1', name: 'A', price: 120000, image: 'x', quantity: 2, price_tiers: tiers } as any;
      expect(getCartTierBadge(item)).toEqual({ label: 'Desde 1 unds: Gs. 120.000', active: false });
    });

    it('shows the cheapest applicable tier as active at qty 15', () => {
      const item = { id: '1', name: 'A', price: 120000, image: 'x', quantity: 15, price_tiers: tiers } as any;
      expect(getCartTierBadge(item)).toEqual({ label: 'Desde 15 unds: Gs. 100.000', active: true });
    });

    it('returns null when quantity is below all tier minimums', () => {
      const highTiers = [{ id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 10, price: 18000 }];
      const item = { id: '1', name: 'A', price: 20000, image: 'x', quantity: 2, price_tiers: highTiers } as any;
      expect(getCartTierBadge(item)).toBeNull();
    });

    it('returns null when no price_tiers', () => {
      const item = { id: '1', name: 'A', price: 100, image: 'x', quantity: 1 } as any;
      expect(getCartTierBadge(item)).toBeNull();
    });
  });

  describe('migrateCart (normalization)', () => {
    it('refreshes stale selected_tier_* from live tiers (stale 17000 → 20000)', () => {
      const tiers = [
        { id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 1, price: 20000 },
        { id: 't2', branch_id: 'b1', branch_name: 'B', min_quantity: 24, price: 17000 },
      ];
      const items = [{
        id: '1', composite_key: '1', name: 'A', price: 20000, image: 'x', quantity: 1,
        price_tiers: tiers, selected_tier_id: 't2', selected_tier_price: 17000, selected_tier_min_qty: 24,
      }];
      const migrated = migrateCart(items as any);
      expect(migrated[0].selected_tier_price).toBe(20000);
      expect(migrated[0].selected_tier_id).toBe('t1');
      expect(migrated[0].selected_tier_min_qty).toBe(1);
    });

    it('sanitizes invalid quantities to 1', () => {
      const items = [{ id: '1', composite_key: '1', name: 'A', price: 100, image: 'x', quantity: 0 }];
      const migrated = migrateCart(items as any);
      expect(migrated[0].quantity).toBe(1);
    });

    it('leaves no-tier items unchanged', () => {
      const items = [{ id: '1', composite_key: '1', name: 'A', price: 100, image: 'x', quantity: 3 }];
      const migrated = migrateCart(items as any);
      expect(migrated[0]).toEqual(items[0]);
    });
  });

  describe('reevalTier', () => {
    it('returns item unchanged when no price_tiers', () => {
      const item = { id: '1', name: 'A', price: 100, image: 'x', quantity: 5 } as any;
      expect(reevalTier(item)).toEqual(item);
    });

    it('sets tier fields based on quantity', () => {
      const tiers = [
        { id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 1, price: 100 },
        { id: 't2', branch_id: 'b1', branch_name: 'B', min_quantity: 10, price: 80 },
      ];
      const item = { id: '1', name: 'A', price: 100, image: 'x', quantity: 15, price_tiers: tiers } as any;
      const result = reevalTier(item);
      expect(result.selected_tier_id).toBe('t2');
      expect(result.selected_tier_price).toBe(80);
      expect(result.selected_tier_min_qty).toBe(10);
    });

    it('clears tier fields when quantity below all tiers', () => {
      const tiers = [
        { id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 1, price: 100 },
        { id: 't2', branch_id: 'b1', branch_name: 'B', min_quantity: 10, price: 80 },
      ];
      const item = { id: '1', name: 'A', price: 100, image: 'x', quantity: 1, price_tiers: tiers, selected_tier_id: 't2', selected_tier_price: 80 } as any;
      const result = reevalTier(item);
      expect(result.selected_tier_id).toBe('t1');
      expect(result.selected_tier_price).toBe(100);
    });
  });

  describe('migrateCart', () => {
    it('adds composite_key to items without it', () => {
      const old = [{ id: '1', name: 'A', price: 100, image: 'x', quantity: 1 }];
      const migrated = migrateCart(old as any);
      expect(migrated[0].composite_key).toBe('1');
    });

    it('preserves existing composite_key', () => {
      const items = [{ id: '1', composite_key: 'custom-key', name: 'A', price: 100, image: 'x', quantity: 1 }];
      const migrated = migrateCart(items as any);
      expect(migrated[0].composite_key).toBe('custom-key');
    });

    it('adds empty price_tiers to items without it', () => {
      const old = [{ id: '1', name: 'A', price: 100, image: 'x', quantity: 1 }];
      const migrated = migrateCart(old as any);
      expect(migrated[0].price_tiers).toEqual([]);
    });

    it('preserves existing price_tiers', () => {
      const tiers = [{ id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 1, price: 100 }];
      const items = [{ id: '1', name: 'A', price: 100, image: 'x', quantity: 1, price_tiers: tiers }];
      const migrated = migrateCart(items as any);
      expect(migrated[0].price_tiers).toEqual(tiers);
    });

    it('returns empty array for empty cart', () => {
      expect(migrateCart([])).toEqual([]);
    });

    it('migrates old hash-based key to readable format', () => {
      const old = [{ id: 'prod-abc', composite_key: 'prod-abc-c248e64', name: 'A', price: 100, image: 'x', quantity: 1 }];
      const migrated = migrateCart(old as any);
      expect(migrated[0].composite_key).toBe('prod-abc');
    });

    it('migrates hash-based key with attributes to readable format', () => {
      const attrs = { 'mod-color': { value_id: 'v-negro', label: 'Negro', raw_value: 'negro' } };
      const old = [{
        id: 'prod-abc', composite_key: 'prod-abc-a1b2c3', name: 'A', price: 100, image: 'x', quantity: 1,
        selected_attributes: attrs,
      }];
      const migrated = migrateCart(old as any);
      expect(migrated[0].composite_key).toBe('prod-abc:mod-color=v-negro');
    });

    it('preserves readable-format composite_key', () => {
      const items = [{ id: '1', composite_key: '1:color=negro~size=s', name: 'A', price: 100, image: 'x', quantity: 1 }];
      const migrated = migrateCart(items as any);
      expect(migrated[0].composite_key).toBe('1:color=negro~size=s');
    });

    it('preserves product-id-only composite_key', () => {
      const items = [{ id: '1', composite_key: '1', name: 'A', price: 100, image: 'x', quantity: 1 }];
      const migrated = migrateCart(items as any);
      expect(migrated[0].composite_key).toBe('1');
    });
  });

  describe('isHashKey', () => {
    it('returns true for old hash-based key', () => {
      expect(isHashKey('prod-abc-c248e64')).toBe(true);
    });

    it('returns false for readable key with colon', () => {
      expect(isHashKey('prod-abc:color=negro')).toBe(false);
    });

    it('returns false for product-id-only key', () => {
      expect(isHashKey('prod-abc')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isHashKey('')).toBe(false);
    });

    it('returns false for key with short hex suffix', () => {
      expect(isHashKey('prod-abc-ab')).toBe(false);
    });
  });
});

describe('cart', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('getCart', () => {
    it('returns empty array when localStorage is empty', () => {
      expect(getCart()).toEqual([]);
    });

    it('parses cart from localStorage and migrates items', () => {
      const cart = [{ id: '1', name: 'Test', price: 100, image: 'img.webp', quantity: 2 }];
      localStorageMock.setItem('cart', JSON.stringify(cart));
      const result = getCart();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result[0].composite_key).toBe('1');
      expect(result[0].price_tiers).toEqual([]);
    });

    it('returns empty array on invalid JSON', () => {
      localStorageMock.setItem('cart', 'not-json');
      expect(getCart()).toEqual([]);
    });

    it('migrates old items to include composite_key', () => {
      const old = [{ id: '1', name: 'A', price: 100, image: 'x', quantity: 1 }];
      localStorageMock.setItem('cart', JSON.stringify(old));
      const result = getCart();
      expect(result[0].composite_key).toBe('1');
    });
  });

  describe('addToCart', () => {
    it('adds a new product to empty cart', () => {
      const product = { id: '1', name: 'Remera', price: 100000, image: 'img.webp' };
      const result = addToCart(product);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result[0].quantity).toBe(1);
    });

    it('increments quantity for existing product', () => {
      const product = { id: '1', name: 'Remera', price: 100000, image: 'img.webp', quantity: 2 };
      addToCart(product);
      const result = addToCart({ ...product, quantity: 3 });
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(5); // 2 + 3
    });

    it('adds different products separately', () => {
      addToCart({ id: '1', name: 'A', price: 100, image: 'a.webp' });
      addToCart({ id: '2', name: 'B', price: 200, image: 'b.webp' });
      const result = getCart();
      expect(result).toHaveLength(2);
    });

    it('defaults quantity to 1 when not provided', () => {
      const result = addToCart({ id: '1', name: 'A', price: 100, image: 'a.webp' });
      expect(result[0].quantity).toBe(1);
    });

    it('assigns composite_key to new items', () => {
      const result = addToCart({ id: '1', name: 'A', price: 100, image: 'a.webp' });
      expect(result[0].composite_key).toBe('1');
    });

    it('clamps quantity above MAX_QUANTITY to 9999', () => {
      const result = addToCart({ id: '1', name: 'A', price: 100, image: 'a.webp', quantity: 10000 });
      expect(result[0].quantity).toBe(9999);
    });

    it('clamps the summed quantity when an existing item would exceed MAX_QUANTITY', () => {
      addToCart({ id: '1', name: 'A', price: 100, image: 'a.webp', quantity: 9999 });
      const result = addToCart({ id: '1', name: 'A', price: 100, image: 'a.webp', quantity: 1 });
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(9999);
    });
  });

  describe('addToCartWithOptions', () => {
    it('adds a product with tier info and price_tiers', () => {
      const tiers = [{ id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 1, price: 100 }];
      const result = addToCartWithOptions({
        id: '1', name: 'Remera', price: 100000, image: 'img.webp',
        price_tiers: tiers,
        selected_tier_id: 'tier-1', selected_tier_price: 90000, selected_tier_min_qty: 10,
      });
      expect(result[0].selected_tier_id).toBe('tier-1');
      expect(result[0].selected_tier_price).toBe(90000);
      expect(result[0].price_tiers).toEqual(tiers);
    });

    it('adds a product with variant attributes', () => {
      const attrs = { mod_1: { value_id: 'v1', label: 'S', raw_value: 'small' } };
      const result = addToCartWithOptions({
        id: '1', name: 'Remera', price: 100000, image: 'img.webp',
        selected_attributes: attrs,
      });
      expect(result[0].selected_attributes).toEqual(attrs);
      expect(result[0].composite_key).toBeTruthy();
    });

    it('matches duplicates by composite_key', () => {
      const attrs = { mod_1: { value_id: 'v1', label: 'S', raw_value: 'small' } };
      addToCartWithOptions({
        id: '1', name: 'Remera', price: 100000, image: 'img.webp',
        quantity: 1, selected_attributes: attrs,
      });
      // Same id, different attributes
      const attrs2 = { mod_1: { value_id: 'v2', label: 'M', raw_value: 'medium' } };
      const result = addToCartWithOptions({
        id: '1', name: 'Remera', price: 100000, image: 'img.webp',
        quantity: 1, selected_attributes: attrs2,
      });
      expect(result).toHaveLength(2); // Different attributes = separate items
    });

    it('increments quantity for same composite_key', () => {
      const attrs = { mod_1: { value_id: 'v1', label: 'S', raw_value: 'small' } };
      addToCartWithOptions({
        id: '1', name: 'Remera', price: 100000, image: 'img.webp',
        quantity: 2, selected_attributes: attrs,
      });
      const result = addToCartWithOptions({
        id: '1', name: 'Remera', price: 100000, image: 'img.webp',
        quantity: 3, selected_attributes: attrs,
      });
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(5);
    });

    it('updates price_tiers on existing item', () => {
      const tiers = [{ id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 1, price: 100 }];
      addToCartWithOptions({
        id: '1', name: 'Remera', price: 100000, image: 'img.webp',
        quantity: 1, price_tiers: tiers,
      });
      const newTiers = [...tiers, { id: 't2', branch_id: 'b1', branch_name: 'B', min_quantity: 10, price: 80 }];
      const result = addToCartWithOptions({
        id: '1', name: 'Remera', price: 100000, image: 'img.webp',
        quantity: 1, price_tiers: newTiers,
      });
      expect(result[0].price_tiers).toEqual(newTiers);
    });

    it('clamps quantity above MAX_QUANTITY to 9999', () => {
      const result = addToCartWithOptions({
        id: '1', name: 'Remera', price: 100000, image: 'img.webp', quantity: 10000,
      });
      expect(result[0].quantity).toBe(9999);
    });
  });

  describe('getCartCount', () => {
    it('returns 0 for empty cart', () => {
      expect(getCartCount()).toBe(0);
    });

    it('sums all item quantities', () => {
      addToCart({ id: '1', name: 'A', price: 100, image: 'a.webp', quantity: 3 });
      addToCart({ id: '2', name: 'B', price: 200, image: 'b.webp', quantity: 2 });
      expect(getCartCount()).toBe(5);
    });
  });

  describe('updateCartQuantity', () => {
    it('updates quantity for existing item', () => {
      addToCart({ id: '1', name: 'A', price: 100, image: 'a.webp', quantity: 1 });
      const result = updateCartQuantity('1', 5);
      expect(result[0].quantity).toBe(5);
    });

    it('does nothing for non-existent item', () => {
      addToCart({ id: '1', name: 'A', price: 100, image: 'a.webp', quantity: 1 });
      const result = updateCartQuantity('999', 5);
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(1);
    });

    it('clamps quantity above MAX_QUANTITY to 9999', () => {
      addToCart({ id: '1', name: 'A', price: 100, image: 'a.webp', quantity: 1 });
      const result = updateCartQuantity('1', 10000);
      expect(result[0].quantity).toBe(9999);
    });

    it('enforces minimum quantity of 1', () => {
      addToCart({ id: '1', name: 'A', price: 100, image: 'a.webp', quantity: 1 });
      const result = updateCartQuantity('1', 0);
      expect(result[0].quantity).toBe(1);
    });

    it('re-evaluates tier pricing after quantity change', () => {
      const tiers = [
        { id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 1, price: 100 },
        { id: 't2', branch_id: 'b1', branch_name: 'B', min_quantity: 10, price: 80 },
      ];
      addToCartWithOptions({
        id: '1', name: 'A', price: 100, image: 'a.webp',
        quantity: 1, price_tiers: tiers,
      });
      const result = updateCartQuantity('1', 15);
      expect(result[0].selected_tier_id).toBe('t2');
      expect(result[0].selected_tier_price).toBe(80);
    });

    it('falls back to base price (not stale tier) when qty reduced below tier minimum (D4)', () => {
      const tiers = [
        { id: 't1', branch_id: 'b1', branch_name: 'B', min_quantity: 1, price: 20000 },
        { id: 't2', branch_id: 'b1', branch_name: 'B', min_quantity: 24, price: 17000 },
      ];
      addToCartWithOptions({
        id: '1', name: 'A', price: 20000, image: 'a.webp', quantity: 24, price_tiers: tiers,
        selected_tier_id: 't2', selected_tier_price: 17000, selected_tier_min_qty: 24,
      });
      const result = updateCartQuantity('1', 1);
      expect(result[0].selected_tier_price).toBe(20000);
      const item = result[0];
      expect(getEffectivePrice({
        ...item,
        selected_attributes: { 'mod-size': { value_id: 'v-s', label: 'S', raw_value: 'S', price_modifier: 1000 } },
      } as any)).toBe(21000);
    });
  });

  describe('removeFromCart', () => {
    it('removes item by composite_key', () => {
      addToCart({ id: '1', name: 'A', price: 100, image: 'a.webp' });
      addToCart({ id: '2', name: 'B', price: 200, image: 'b.webp' });
      const result = removeFromCart('1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('returns empty array when removing last item', () => {
      addToCart({ id: '1', name: 'A', price: 100, image: 'a.webp' });
      const result = removeFromCart('1');
      expect(result).toEqual([]);
    });
  });

  describe('clearCart', () => {
    it('removes all items from cart', () => {
      addToCart({ id: '1', name: 'A', price: 100, image: 'a.webp', quantity: 2 });
      addToCart({ id: '2', name: 'B', price: 200, image: 'b.webp', quantity: 1 });
      const result = clearCart();
      expect(result).toEqual([]);
      expect(getCart()).toEqual([]);
    });

    it('returns empty array when cart is already empty', () => {
      const result = clearCart();
      expect(result).toEqual([]);
    });

    it('dispatches cart-updated event', () => {
      clearCart();
      expect(dispatchEventMock).toHaveBeenCalled();
    });
  });

  describe('formatPrice', () => {
    it('formats number without decimals', () => {
      expect(formatPrice(135000)).toBe('135.000');
    });

    it('formats zero', () => {
      expect(formatPrice(0)).toBe('0');
    });

    it('formats large numbers', () => {
      expect(formatPrice(1000000)).toBe('1.000.000');
    });
  });
});

describe('MAX_QUANTITY', () => {
  it('exports the unified upper bound 9999', () => {
    expect(MAX_QUANTITY).toBe(9999);
  });
});
