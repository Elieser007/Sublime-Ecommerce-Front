import { formatPrice } from "./format";
import type { CartItem } from "./cart-utils";
import { getEffectivePrice, getItemTotal, getApplicableTier } from "./cart-utils";

export function formatGuaranies(amount: number): string {
  return formatPrice(amount);
}

export function buildCartMessage(cart: CartItem[]): string {
  if (cart.length === 0) {
    return "🛒 Pedido Sublime E-commerce\n\nCarrito vacío";
  }

  const lines: string[] = ["🛒 *Pedido Sublime E-commerce*", ""];

  let total = 0;

  cart.forEach((item) => {
    const unitPrice = getEffectivePrice(item);
    const subtotal = getItemTotal(item);
    total += subtotal;

    lines.push(`• ${item.name}`);

    if (item.selected_attributes) {
      const attrEntries = Object.values(item.selected_attributes);
      for (const attr of attrEntries) {
        const typeName = attr.type_name || '';
        lines.push(`  ${typeName ? `${typeName}: ` : ''}${attr.label}`);
      }
    }

    lines.push(
      `  ${item.quantity}xGs. ${formatGuaranies(unitPrice)} = *Gs. ${formatGuaranies(subtotal)}*`
    );

    const applicableTier = getApplicableTier(item);
    if (applicableTier) {
      lines.push(
        `  📦 Precio por volumen (${applicableTier.min_quantity}+ unds): Gs. ${formatGuaranies(applicableTier.price)}/u`
      );

      if (item.quantity < applicableTier.min_quantity) {
        lines.push(
          `  ⚠️ *Nota: Precio válido para ${applicableTier.min_quantity}+ unidades. Cantidad actual: ${item.quantity}.*`
        );
      }
    } else if (!item.price_tiers || item.price_tiers.length === 0) {
      if (item.selected_tier_id && item.selected_tier_min_qty) {
        const tierMinQty = item.selected_tier_min_qty;
        const tierPrice = getEffectivePrice(item);

        lines.push(
          `  📦 Precio por volumen (${tierMinQty}+ unds): Gs. ${formatGuaranies(tierPrice)}/u`
        );

        if (item.quantity < tierMinQty) {
          lines.push(
            `  ⚠️ *Nota: Precio válido para ${tierMinQty}+ unidades. Cantidad actual: ${item.quantity}.*`
          );
        }
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

export function calculateCartTotals(cart: CartItem[]): {
  subtotal: number;
  itemCount: number;
} {
  let subtotal = 0;
  let itemCount = 0;

  cart.forEach((item) => {
    subtotal += getItemTotal(item);
    itemCount += item.quantity;
  });

  return { subtotal, itemCount };
}
