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
 */
export function paginateProducts<T>(
  products: T[],
  page: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE);
  const start = (page - 1) * PRODUCTS_PER_PAGE;
  const items = products.slice(start, start + PRODUCTS_PER_PAGE);

  return {
    items,
    totalPages,
    hasNextPage: page < totalPages,
  };
}
