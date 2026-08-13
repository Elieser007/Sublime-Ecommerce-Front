/**
 * Digit-driven width for quantity displays (quantity-9999-dynamic-width).
 *
 * Returns a CSS width that scales with the digit count of `value`:
 *   1    → calc(1ch + 24px)
 *   9999 → calc(4ch + 24px)
 *
 * `ch` tracks the monospace font (Space Mono is pinned in both quantity
 * components), so one formula serves every breakpoint. Fails wide: any
 * non-decimal string representation only widens the field — safe.
 */
export function qtyDisplayWidth(value: number): string {
  return `calc(${String(value).length}ch + 24px)`;
}
