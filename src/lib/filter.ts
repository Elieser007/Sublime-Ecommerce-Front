/**
 * Filter utilities for catalog products.
 *
 * filterByPrice — range filter (inclusive bounds, 0 treated as no bound).
 * filterBySearch — case-insensitive substring match on product name.
 */

export interface FilterableProduct {
  base_price: number;
  name: string;
  [key: string]: any;
}

/**
 * Filter products by price range. Both bounds are inclusive.
 * min=0 or undefined means no lower bound.
 * max=undefined means no upper bound.
 */
export function filterByPrice<T extends FilterableProduct>(
  products: T[],
  min: number | undefined,
  max: number | undefined
): T[] {
  return products.filter((p) => {
    if (min != null && min > 0 && p.base_price < min) return false;
    if (max != null && p.base_price > max) return false;
    return true;
  });
}

/**
 * Filter products by name (case-insensitive substring match).
 * Empty query returns all products.
 */
export function filterBySearch<T extends FilterableProduct>(
  products: T[],
  query: string
): T[] {
  if (!query || query.trim() === '') return products;
  const lower = query.toLowerCase();
  return products.filter((p) => p.name.toLowerCase().includes(lower));
}
