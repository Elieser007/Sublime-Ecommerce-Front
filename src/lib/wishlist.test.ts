import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  isInWishlist,
  getWishlistCount,
  updateWishlistBadge,
} from './wishlist';

// Mock localStorage (mirrors cart.test.ts)
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

// Mock window.dispatchEvent (mirrors cart.test.ts)
const dispatchEventMock = vi.fn();
Object.defineProperty(globalThis, 'window', {
  value: {
    dispatchEvent: dispatchEventMock,
    addEventListener: vi.fn(),
  },
  writable: true,
});

// Mock localStorage on globalThis (mirrors cart.test.ts)
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Minimal document mock for badge assertions
const badgeElement = { textContent: '', style: { display: '' } };
Object.defineProperty(globalThis, 'document', {
  value: {
    getElementById: vi.fn((id: string) => (id === 'wishlist-count' ? badgeElement : null)),
  },
  writable: true,
});

const sampleProduct = { id: '1', slug: 'remera', name: 'Remera', price: 100000, image: 'img.webp' };

describe('wishlist', () => {
  beforeEach(() => {
    localStorageMock.clear();
    badgeElement.textContent = '';
    badgeElement.style.display = '';
    vi.clearAllMocks();
  });

  describe('getWishlist', () => {
    it('returns empty array when localStorage is empty', () => {
      expect(getWishlist()).toEqual([]);
    });

    it('parses wishlist from localStorage', () => {
      const list = [sampleProduct, { ...sampleProduct, id: '2', slug: 'short' }];
      localStorageMock.setItem('wishlist', JSON.stringify(list));
      const result = getWishlist();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('returns empty array on invalid JSON', () => {
      localStorageMock.setItem('wishlist', 'not-json');
      expect(getWishlist()).toEqual([]);
    });
  });

  describe('addToWishlist', () => {
    it('adds a new product with the wishlist item shape', () => {
      const result = addToWishlist(sampleProduct);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: '1', slug: 'remera', name: 'Remera', price: 100000, image: 'img.webp' });
    });

    it('dedupes by id when called twice with the same id', () => {
      addToWishlist(sampleProduct);
      const result = addToWishlist({ ...sampleProduct, price: 99999 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('adds different products separately', () => {
      addToWishlist(sampleProduct);
      const result = addToWishlist({ ...sampleProduct, id: '2', slug: 'short' });
      expect(result).toHaveLength(2);
    });

    it('persists the list to localStorage', () => {
      addToWishlist(sampleProduct);
      const stored = JSON.parse(localStorageMock.getItem('wishlist') || '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('1');
    });

    it('dispatches a storage event', () => {
      addToWishlist(sampleProduct);
      expect(dispatchEventMock).toHaveBeenCalled();
    });
  });

  describe('removeFromWishlist', () => {
    it('removes item by id', () => {
      addToWishlist(sampleProduct);
      addToWishlist({ ...sampleProduct, id: '2', slug: 'short' });
      const result = removeFromWishlist('1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('returns empty array when removing the last item', () => {
      addToWishlist(sampleProduct);
      const result = removeFromWishlist('1');
      expect(result).toEqual([]);
    });

    it('dispatches a storage event after removal', () => {
      addToWishlist(sampleProduct);
      vi.clearAllMocks();
      removeFromWishlist('1');
      expect(dispatchEventMock).toHaveBeenCalled();
    });
  });

  describe('isInWishlist', () => {
    it('returns true for a stored id', () => {
      addToWishlist(sampleProduct);
      expect(isInWishlist('1')).toBe(true);
    });

    it('returns false for an id that is not stored', () => {
      addToWishlist(sampleProduct);
      expect(isInWishlist('999')).toBe(false);
    });

    it('returns false when the wishlist is empty', () => {
      expect(isInWishlist('1')).toBe(false);
    });
  });

  describe('getWishlistCount', () => {
    it('returns 0 for an empty wishlist', () => {
      expect(getWishlistCount()).toBe(0);
    });

    it('counts stored items', () => {
      addToWishlist(sampleProduct);
      addToWishlist({ ...sampleProduct, id: '2', slug: 'short' });
      expect(getWishlistCount()).toBe(2);
    });
  });

  describe('updateWishlistBadge', () => {
    const seed = (count: number) => {
      const list = Array.from({ length: count }, (_, i) => ({
        id: String(i), slug: 's' + i, name: 'P' + i, price: 100, image: 'i.webp',
      }));
      localStorageMock.setItem('wishlist', JSON.stringify(list));
    };

    it('shows the count when under the cap', () => {
      seed(2);
      updateWishlistBadge();
      expect(badgeElement.textContent).toBe('2');
      expect(badgeElement.style.display).toBe('');
    });

    it('caps the text at 99+ for 100 items', () => {
      seed(100);
      updateWishlistBadge();
      expect(badgeElement.textContent).toBe('99+');
    });

    it('hides the badge at zero items', () => {
      seed(0);
      updateWishlistBadge();
      expect(badgeElement.style.display).toBe('none');
    });

    it('shows the badge again when items are added after zero', () => {
      seed(0);
      updateWishlistBadge();
      addToWishlist(sampleProduct);
      updateWishlistBadge();
      expect(badgeElement.textContent).toBe('1');
      expect(badgeElement.style.display).toBe('');
    });
  });
});
