import { describe, it, expect } from 'vitest';
import { paginateProducts, PRODUCTS_PER_PAGE } from './pagination';

const makeProducts = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    name: `Product ${i + 1}`,
    slug: `product-${i + 1}`,
    base_price: (i + 1) * 10000,
    created_at: i,
    section_name: 'Section',
    category_name: 'Category',
    subcategory_name: null,
    image_url: null,
    price_tiers: [],
  }));

describe('paginateProducts', () => {
  it('returns first page with PRODUCTS_PER_PAGE items', () => {
    const products = makeProducts(50);
    const result = paginateProducts(products, 1);
    expect(result.items).toHaveLength(PRODUCTS_PER_PAGE);
    expect(result.items[0].id).toBe('1');
  });

  it('returns remaining items on last page', () => {
    const products = makeProducts(50);
    const result = paginateProducts(products, 3);
    expect(result.items).toHaveLength(2); // 50 - 2*24 = 2
  });

  it('returns empty array for page beyond data', () => {
    const products = makeProducts(10);
    const result = paginateProducts(products, 5);
    expect(result.items).toEqual([]);
  });

  it('returns correct totalPages', () => {
    const products = makeProducts(50);
    const result = paginateProducts(products, 1);
    expect(result.totalPages).toBe(3); // ceil(50/24)
  });

  it('returns correct hasNextPage', () => {
    const products = makeProducts(50);
    expect(paginateProducts(products, 1).hasNextPage).toBe(true);
    expect(paginateProducts(products, 3).hasNextPage).toBe(false);
  });

  it('handles empty array', () => {
    const result = paginateProducts([], 1);
    expect(result.items).toEqual([]);
    expect(result.totalPages).toBe(0);
    expect(result.hasNextPage).toBe(false);
  });

  it('handles single product', () => {
    const result = paginateProducts(makeProducts(1), 1);
    expect(result.items).toHaveLength(1);
    expect(result.totalPages).toBe(1);
    expect(result.hasNextPage).toBe(false);
  });

  it('handles exactly PRODUCTS_PER_PAGE items', () => {
    const products = makeProducts(PRODUCTS_PER_PAGE);
    const result = paginateProducts(products, 1);
    expect(result.items).toHaveLength(PRODUCTS_PER_PAGE);
    expect(result.totalPages).toBe(1);
    expect(result.hasNextPage).toBe(false);
  });

  it('returns items in original order', () => {
    const products = makeProducts(30);
    const page1 = paginateProducts(products, 1);
    const page2 = paginateProducts(products, 2);
    expect(page1.items[0].id).toBe('1');
    expect(page2.items[0].id).toBe('25');
  });
});
