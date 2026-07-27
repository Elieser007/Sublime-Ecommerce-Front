/**
 * Shared formatting utilities for Sublime E-commerce.
 *
 * Single source of truth for price/number formatting.
 * Used by cart.js, whatsapp.ts, and any other module
 * that needs to display Guaraníes-formatted numbers.
 */

/**
 * Format a number as Guaraníes (Gs.) with dot thousands separator, no decimals.
 *
 * @example formatPrice(120000) → "120.000"
 * @example formatPrice(0) → "0"
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(price);
}
