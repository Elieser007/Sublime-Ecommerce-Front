import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  isInWishlist,
  getWishlistCount,
  updateWishlistBadge,
} from './wishlist';
// Shared fake browser environment (localStorage/window/document): installed for
// every test file by vitest.config.ts -> setupFiles (see test/browser-env.ts)
import {
  localStorageMock,
  dispatchEventMock,
  registerElement,
  resetBrowserEnv,
} from '../../test/browser-env';

// Badge target for updateWishlistBadge() assertions
const badgeElement = { textContent: '', style: { display: '' } };
registerElement('wishlist-count', badgeElement);

const sampleProduct = { id: '1', slug: 'remera', name: 'Remera', price: 100000, image: 'img.webp' };

describe('wishlist', () => {
  beforeEach(() => {
    resetBrowserEnv();
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

    it('returns empty array when JSON is valid but not an array', () => {
      localStorageMock.setItem('wishlist', '{}');
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
