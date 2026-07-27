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

describe('cart', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('getCart', () => {
    it('returns empty array when localStorage is empty', () => {
      expect(getCart()).toEqual([]);
    });

    it('parses cart from localStorage', () => {
      const cart = [{ id: '1', name: 'Test', price: 100, image: 'img.webp', quantity: 2 }];
      localStorageMock.setItem('cart', JSON.stringify(cart));
      expect(getCart()).toEqual(cart);
    });

    it('returns empty array on invalid JSON', () => {
      localStorageMock.setItem('cart', 'not-json');
      expect(getCart()).toEqual([]);
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
    it('adds a product with tier info', () => {
      const result = addToCartWithOptions({
        id: '1', name: 'Remera', price: 100000, image: 'img.webp',
        selected_tier_id: 'tier-1', selected_tier_price: 90000, selected_tier_min_qty: 10,
      });
      expect(result[0].selected_tier_id).toBe('tier-1');
      expect(result[0].selected_tier_price).toBe(90000);
    });

    it('adds a product with variant attributes', () => {
      const attrs = { mod_1: { value_id: 'v1', label: 'S', raw_value: 'small' } };
      const result = addToCartWithOptions({
        id: '1', name: 'Remera', price: 100000, image: 'img.webp',
        selected_attributes: attrs,
      });
      expect(result[0].selected_attributes).toEqual(attrs);
    });

    it('matches duplicates by id + attributes', () => {
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

    it('increments quantity for same id + same attributes', () => {
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
  });

  describe('removeFromCart', () => {
    it('removes item by id', () => {
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
