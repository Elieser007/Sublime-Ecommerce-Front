import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const PAGES_DIR = resolve(__dirname, '../pages');
const page = readFileSync(resolve(PAGES_DIR, 'wishlist.astro'), 'utf-8');
const header = readFileSync(resolve(__dirname, '../components/Header.astro'), 'utf-8');

describe('wishlist page (REQ-wishlist-page)', () => {
  it('renders inside BaseLayout', () => {
    expect(page).toContain("import BaseLayout from '../layouts/BaseLayout.astro'");
    expect(page).toContain('<BaseLayout');
  });

  it('renders from storage via the wishlist lib', () => {
    expect(page).toContain("from '../lib/wishlist.js'");
    expect(page).toContain('getWishlist');
    expect(page).toContain('removeFromWishlist');
  });

  it('reuses the existing cart helper for add-to-cart', () => {
    expect(page).toContain("import { addToCart } from '../lib/cart.js'");
  });

  it('formats prices with formatPrice and resolves images with getProductImageUrl', () => {
    expect(page).toContain('formatPrice(');
    expect(page).toContain('getProductImageUrl(');
  });

  it('shows a skeleton while JS loads', () => {
    expect(page).toContain('skeleton-item');
  });

  it('listens to storage and wishlist-updated events', () => {
    expect(page).toContain('addEventListener("storage"');
    expect(page).toContain('addEventListener("wishlist-updated"');
  });

  it('renders an empty state with a CTA to the catalog', () => {
    expect(page).toContain('empty-state');
    expect(page).toContain('href="/"');
  });

  it('labels remove buttons with aria-label', () => {
    expect(page).toContain('aria-label="Eliminar ');
  });

  it('dispatches wishlist-updated after DOM mutations', () => {
    expect(page).toContain("CustomEvent('wishlist-updated')");
  });

  it('calls removeFromWishlist only in the remove handler, keeping add-to-cart non-destructive', () => {
    const removeCalls = page.match(/removeFromWishlist\(/g) || [];
    const addCalls = page.match(/addToCart\(/g) || [];
    expect(removeCalls).toHaveLength(1);
    expect(addCalls).toHaveLength(1);
  });
});

describe('header wishlist wiring (REQ-header-badge-link)', () => {
  it('links the wishlist action to /wishlist', () => {
    expect(header).toContain('href="/wishlist"');
    expect(header).not.toContain('href="/deseos"');
  });

  it('imports updateWishlistBadge from the wishlist lib', () => {
    expect(header).toContain("from '../lib/wishlist.js'");
    expect(header).toContain('updateWishlistBadge');
  });

  it('wires storage and wishlist-updated listeners to updateWishlistBadge', () => {
    expect(header).toContain('window.addEventListener("storage", updateWishlistBadge)');
    expect(header).toContain('window.addEventListener("wishlist-updated", updateWishlistBadge)');
  });

  it('updates the badge on page load', () => {
    expect(header).toContain('updateWishlistBadge();');
  });

  it('detects the catalog with the /products prefix', () => {
    expect(header).toContain("currentPath.startsWith('/products')");
    expect(header).not.toContain("currentPath.startsWith('/producto')");
  });

  it('hides the wishlist button below 768px', () => {
    const mediaQuery = header.indexOf('@media (max-width: 767px)');
    const wishlistBtn = header.indexOf('#wishlist-btn {');
    expect(mediaQuery).toBeGreaterThan(-1);
    expect(wishlistBtn).toBeGreaterThan(mediaQuery);
  });
});
