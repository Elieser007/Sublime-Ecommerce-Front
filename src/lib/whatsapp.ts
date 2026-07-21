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
 */

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

/**
 * Format a number as Guaraníes (Gs.)
 * Uses dot as thousands separator, no decimals.
 * 
 * @example formatGuaranies(120000) → "120.000"
 */
export function formatGuaranies(amount: number): string {
  return new Intl.NumberFormat("es-PY", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Build the WhatsApp message from cart items.
 * 
 * Structure:
 * - Header: 🛒 Pedido Sublime E-commerce
 * - Items: product name, quantity x price = subtotal
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
    const subtotal = item.price * item.quantity;
    total += subtotal;

    // Product line: "• Product Name"
    lines.push(`• ${item.name}`);
    // Detail line: "  2xGs. 120.000 = *Gs. 240.000*"
    lines.push(
      `  ${item.quantity}xGs. ${formatGuaranies(item.price)} = *Gs. ${formatGuaranies(subtotal)}*`
    );
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
