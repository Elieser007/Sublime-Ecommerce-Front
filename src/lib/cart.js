/**
 * Cart utility — LocalStorage-based cart for Sublime E-commerce
 *
 * Single source of truth for cart operations.
 * Used by ProductCard, Header, CartSummary, etc.
 */

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
 * Add a product to the cart (or increment quantity if exists)
 * @param {Object} product - { id, name, price, image, quantity?, price_tiers? }
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
 * Get total item count in cart
 * @returns {number}
 */
export function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Format price in Guaraníes (no decimals)
 * @param {number} price
 * @returns {string}
 */
export function formatPrice(price) {
  return new Intl.NumberFormat('es-PY', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(price);
}
