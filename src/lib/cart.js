/**
 * Cart utility — LocalStorage-based cart for Sublime E-commerce
 *
 * Single source of truth for cart operations.
 * Used by ProductCard, Header, CartSummary, ProductDetail, etc.
 */

import { formatPrice } from './format.ts';

export { formatPrice };

const CART_KEY = 'cart';

/**
 * Get the full cart array from LocalStorage
 * @returns {Array} cart items
 */
export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
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
 * Matches duplicates by id + selected_attributes.
 * Used by the product detail page where variants and tier pricing matter.
 *
 * @param {Object} product - { id, name, price, image, quantity?, selected_tier_id?, selected_tier_price?, selected_tier_min_qty?, selected_attributes? }
 * @returns {Array} updated cart
 */
export function addToCartWithOptions(product) {
  const cart = getCart();
  const hasAttributes = product.selected_attributes && Object.keys(product.selected_attributes).length > 0;

  const existing = cart.find((item) => {
    if (item.id !== product.id) return false;
    if (!hasAttributes && !item.selected_attributes) return true;
    if (hasAttributes && item.selected_attributes) {
      return JSON.stringify(item.selected_attributes) === JSON.stringify(product.selected_attributes);
    }
    return false;
  });

  if (existing) {
    existing.quantity += product.quantity || 1;
    // Update tier info if provided
    if (product.selected_tier_id) {
      existing.selected_tier_id = product.selected_tier_id;
      existing.selected_tier_price = product.selected_tier_price;
      existing.selected_tier_min_qty = product.selected_tier_min_qty;
    }
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: product.quantity || 1,
      ...(product.selected_tier_id ? {
        selected_tier_id: product.selected_tier_id,
        selected_tier_price: product.selected_tier_price,
        selected_tier_min_qty: product.selected_tier_min_qty,
      } : {}),
      ...(hasAttributes ? { selected_attributes: product.selected_attributes } : {}),
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
 * Update quantity for a cart item by product id.
 * @param {string} productId
 * @param {number} quantity - new quantity (minimum 1)
 * @returns {Array} updated cart
 */
export function updateCartQuantity(productId, quantity) {
  const cart = getCart();
  const item = cart.find((i) => i.id === productId);
  if (item) {
    item.quantity = Math.max(1, quantity);
    saveCart(cart);
  }
  return cart;
}

/**
 * Remove a product from the cart by id.
 * @param {string} productId
 * @returns {Array} updated cart
 */
export function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.id !== productId);
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
