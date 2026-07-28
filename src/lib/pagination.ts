/**
 * Pagination utility for catalog products.
 *
 * Client-side pagination: 24 products per page.
 */

export const PRODUCTS_PER_PAGE = 24;

export interface PaginatedResult<T> {
  items: T[];
  totalPages: number;
  hasNextPage: boolean;
}

/**
 * Slice products into a page. Page 1 = first chunk.
 * Returns empty items for out-of-range pages.
 * @param perPage — items per page (defaults to PRODUCTS_PER_PAGE)
 */
export function paginateProducts<T>(
  products: T[],
  page: number,
  perPage: number = PRODUCTS_PER_PAGE
): PaginatedResult<T> {
  const totalPages = Math.ceil(products.length / perPage);
  const start = (page - 1) * perPage;
  const items = products.slice(start, start + perPage);

  return {
    items,
    totalPages,
    hasNextPage: page < totalPages,
  };
}
