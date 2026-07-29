/**
 * Cart utility — LocalStorage-based cart for Sublime E-commerce
 *
 * Single source of truth for cart operations.
 * Used by ProductCard, Header, CartSummary, ProductDetail, etc.
 */

import { formatPrice } from './format.ts';
import { getCartKey, reevalTier, migrateCart } from './cart-utils';

export { formatPrice };

const CART_KEY = 'cart';

/**
 * Get the full cart array from LocalStorage.
 * Auto-migrates old items (adds composite_key and price_tiers).
 * @returns {Array} cart items
 */
export function getCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return migrateCart(raw);
  } catch {
    return [];
  }
}

/**
 * Save cart array to LocalStorage
 * @param {Array} cart
 */
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event('storage'));
}

/**
 * Add a product to the cart (or increment quantity if exists).
 * Simple version — no variant attributes or tier pricing.
 * @param {Object} product - { id, name, price, image, quantity? }
 * @returns {Array} updated cart
 */
export function addToCart(product) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.quantity += product.quantity || 1;
  } else {
    cart.push({
      id: product.id,
      composite_key: getCartKey(product.id),
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: product.quantity || 1,
    });
  }

  saveCart(cart);
  return cart;
}

/**
 * Add a product with options (variant attributes, tier pricing).
 * Matches duplicates by composite_key (id + hash of attributes).
 * Used by the product detail page where variants and tier pricing matter.
 *
 * @param {Object} product - { id, name, price, image, quantity?, price_tiers?, selected_tier_id?, selected_tier_price?, selected_tier_min_qty?, selected_attributes? }
 * @returns {Array} updated cart
 */
export function addToCartWithOptions(product) {
  const cart = getCart();
  const compositeKey = getCartKey(product.id, product.selected_attributes);

  const existing = cart.find((item) => item.composite_key === compositeKey);

  if (existing) {
    existing.quantity += product.quantity || 1;
    if (product.selected_tier_id) {
      existing.selected_tier_id = product.selected_tier_id;
      existing.selected_tier_price = product.selected_tier_price;
      existing.selected_tier_min_qty = product.selected_tier_min_qty;
    }
    if (product.price_tiers) {
      existing.price_tiers = product.price_tiers;
    }
  } else {
    cart.push({
      id: product.id,
      composite_key: compositeKey,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: product.quantity || 1,
      ...(product.price_tiers ? { price_tiers: product.price_tiers } : {}),
      ...(product.selected_tier_id ? {
        selected_tier_id: product.selected_tier_id,
        selected_tier_price: product.selected_tier_price,
        selected_tier_min_qty: product.selected_tier_min_qty,
      } : {}),
      ...(product.selected_attributes ? { selected_attributes: product.selected_attributes } : {}),
    });
  }

  saveCart(cart);
  return cart;
}

/**
 * Get total item count in cart
 * @returns {number}
 */
export function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Update quantity for a cart item by composite_key.
 * Re-evaluates tier pricing after quantity change.
 * @param {string} compositeKey
 * @param {number} quantity - new quantity (minimum 1)
 * @returns {Array} updated cart
 */
export function updateCartQuantity(compositeKey, quantity) {
  const cart = getCart();
  const item = cart.find((i) => i.composite_key === compositeKey);
  if (item) {
    item.quantity = Math.max(1, quantity);
    const reevaluated = reevalTier(item);
    Object.assign(item, reevaluated);
    saveCart(cart);
  }
  return cart;
}

/**
 * Remove a product from the cart by composite_key.
 * @param {string} compositeKey
 * @returns {Array} updated cart
 */
export function removeFromCart(compositeKey) {
  const cart = getCart().filter((item) => item.composite_key !== compositeKey);
  saveCart(cart);
  return cart;
}

/**
 * Clear all items from the cart.
 * @returns {Array} empty cart
 */
export function clearCart() {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event('storage'));
  return [];
}

/**
 * Update the header cart badge count and visibility.
 */
export function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (badge) {
    badge.textContent = getCartCount().toString();
    badge.style.display = '';
  }
}
