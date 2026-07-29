/**
 * WhatsApp Checkout — Tarea 4
 * 
 * Generates a wa.me link with a formatted order message.
 * 
 * Flow:
 * 1. Read cart from LocalStorage
 * 2. Calculate subtotals and total in Guaraníes (Gs.)
 * 3. Build readable message for the seller
 * 4. Generate wa.me link with encodeURIComponent
 * 
 * The message is clean, structured, and seller-friendly.
 * Supports volume pricing tiers with warning if qty < tier minimum.
 */

import type { PriceTier } from "./public-api";
import { formatPrice } from "./format";
import { getEffectivePrice } from "./cart-utils";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  // Volume pricing tier fields (optional for backward compat)
  selected_tier_id?: string;
  selected_tier_price?: number;
  selected_tier_min_qty?: number;
  // Variant attributes (optional for backward compat)
  selected_attributes?: Record<string, {
    value_id: string;
    label: string;
    raw_value: string;
  }>;
}

/**
 * Format a number as Guaraníes (Gs.)
 * Delegates to shared formatPrice utility.
 * 
 * @example formatGuaranies(120000) → "120.000"
 */
export function formatGuaranies(amount: number): string {
  return formatPrice(amount);
}

/**
 * Build the WhatsApp message from cart items.
 * Includes volume tier info and warning if quantity < tier minimum.
 * 
 * Structure:
 * - Header: 🛒 Pedido Sublime E-commerce
 * - Items: product name, quantity x price = subtotal
 *   If item has tier: includes tier line and warning if qty < min
 * - Footer: 💰 Total + confirmation line
 * 
 * @param cart - Array of cart items
 * @returns Formatted message string
 */
export function buildCartMessage(cart: CartItem[]): string {
  if (cart.length === 0) {
    return "🛒 Pedido Sublime E-commerce\n\nCarrito vacío";
  }

  const lines: string[] = ["🛒 *Pedido Sublime E-commerce*", ""];

  let total = 0;

  cart.forEach((item) => {
    // Use effective price (tier + attribute surcharges)
    const unitPrice = getEffectivePrice(item);
    const subtotal = unitPrice * item.quantity;
    total += subtotal;

    // Product line: "• Product Name"
    lines.push(`• ${item.name}`);

    // Variant attributes (Color: Rojo, Talle: XL)
    if (item.selected_attributes) {
      const attrEntries = Object.values(item.selected_attributes);
      for (const attr of attrEntries) {
        lines.push(`  ${attr.label}`);
      }
    }

    // Detail line: "  2xGs. 120.000 = *Gs. 240.000*"
    lines.push(
      `  ${item.quantity}xGs. ${formatGuaranies(unitPrice)} = *Gs. ${formatGuaranies(subtotal)}*`
    );

    // Volume tier info
    if (item.selected_tier_id && item.selected_tier_min_qty) {
      const tierMinQty = item.selected_tier_min_qty;
      const tierPrice = getEffectivePrice(item);
      
      lines.push(
        `  📦 Precio por volumen (${tierMinQty}+ unds): Gs. ${formatGuaranies(tierPrice)}/u`
      );
      
      // Warning if quantity doesn't meet tier minimum
      if (item.quantity < tierMinQty) {
        lines.push(
          `  ⚠️ *Nota: Precio válido para ${tierMinQty}+ unidades. Cantidad actual: ${item.quantity}.*`
        );
      }
    }
  });

  const formattedTotal = formatGuaranies(total);

  lines.push("");
  lines.push(`💰 *Total: Gs. ${formattedTotal}*`);
  lines.push("");
  lines.push("📝 Confirmo mi pedido. ¡Gracias!");

  return lines.join("\n");
}

/**
 * Generate a wa.me URL with the cart message.
 * 
 * @param cart - Array of cart items
 * @param phone - WhatsApp phone number (with country code, no + or spaces)
 * @returns wa.me URL or "#" if cart is empty
 */
export function generateWhatsAppUrl(
  cart: CartItem[],
  phone: string
): string {
  if (cart.length === 0) {
    return "#";
  }

  const message = buildCartMessage(cart);
  const encoded = encodeURIComponent(message);

  return `https://wa.me/${phone}?text=${encoded}`;
}

/**
 * Read cart from LocalStorage.
 * Returns empty array if no cart exists.
 */
export function getCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem("cart");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Calculate cart totals using tier prices when available
 */
export function calculateCartTotals(cart: CartItem[]): {
  subtotal: number;
  itemCount: number;
} {
  let subtotal = 0;
  let itemCount = 0;

  cart.forEach((item) => {
    const unitPrice = getEffectivePrice(item);
    subtotal += unitPrice * item.quantity;
    itemCount += item.quantity;
  });

  return { subtotal, itemCount };
}