/**
 * Sort utility for catalog products.
 *
 * Sort modes:
 * - "default": original order (created_at DESC from API)
 * - "price-asc": cheapest first
 * - "price-desc": most expensive first
 * - "name": alphabetical A-Z (case-insensitive)
 */

export type SortMode = 'default' | 'price-asc' | 'price-desc' | 'name';

export interface SortableProduct {
  base_price: number;
  name: string;
  created_at: number;
  [key: string]: any;
}

/**
 * Sort products by the given mode. Returns a NEW array — never mutates input.
 */
export function sortProducts<T extends SortableProduct>(
  products: T[],
  mode: SortMode
): T[] {
  const copy = [...products];

  switch (mode) {
    case 'price-asc':
      return copy.sort((a, b) => a.base_price - b.base_price);

    case 'price-desc':
      return copy.sort((a, b) => b.base_price - a.base_price);

    case 'name':
      return copy.sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      );

    case 'default':
    default:
      return copy;
  }
}
