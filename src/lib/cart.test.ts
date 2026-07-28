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
} from './cart';
import { djb2Hash, getCartKey, getEffectivePrice, reevalTier, migrateCart } from './cart-utils';

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
  describe('djb2Hash', () => {
    it('returns a hex string', () => {
      expect(djb2Hash('hello')).toMatch(/^[0-9a-f]+$/);
    });

    it('is deterministic', () => {
      expect(djb2Hash('test')).toBe(djb2Hash('test'));
    });

    it('produces different hashes for different inputs', () => {
      expect(djb2Hash('a')).not.toBe(djb2Hash('b'));
    });
  });

  describe('getCartKey', () => {
    it('returns productId when no attributes', () => {
      expect(getCartKey('123')).toBe('123');
    });

    it('returns productId when attributes is empty', () => {
      expect(getCartKey('123', {})).toBe('123');
    });

    it('returns composite key with hash when attributes present', () => {
      const key = getCartKey('123', { mod_1: 'v1' });
      expect(key).toMatch(/^123-[0-9a-f]+$/);
    });

    it('produces same key for same attributes regardless of order', () => {
      const key1 = getCartKey('123', { b: '2', a: '1' });
      const key2 = getCartKey('123', { a: '1', b: '2' });
      expect(key1).toBe(key2);
    });

    it('produces different keys for different attributes', () => {
      const key1 = getCartKey('123', { a: '1' });
      const key2 = getCartKey('123', { a: '2' });
      expect(key1).not.toBe(key2);
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
