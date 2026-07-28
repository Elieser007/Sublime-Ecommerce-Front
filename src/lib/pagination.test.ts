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

  // ===== perPage parameter =====

  it('returns 12 items when perPage=12', () => {
    const products = makeProducts(50);
    const result = paginateProducts(products, 1, 12);
    expect(result.items).toHaveLength(12);
    expect(result.items[0].id).toBe('1');
  });

  it('returns 48 items when perPage=48', () => {
    const products = makeProducts(100);
    const result = paginateProducts(products, 1, 48);
    expect(result.items).toHaveLength(48);
    expect(result.items[0].id).toBe('1');
  });

  it('paginates correctly with perPage=12 across pages', () => {
    const products = makeProducts(30);
    const page1 = paginateProducts(products, 1, 12);
    const page2 = paginateProducts(products, 2, 12);
    const page3 = paginateProducts(products, 3, 12);
    expect(page1.items).toHaveLength(12);
    expect(page2.items).toHaveLength(12);
    expect(page3.items).toHaveLength(6); // 30 - 2*12 = 6
    expect(page1.items[0].id).toBe('1');
    expect(page2.items[0].id).toBe('13');
    expect(page3.items[0].id).toBe('25');
  });

  it('calculates totalPages correctly with perPage=12', () => {
    const products = makeProducts(50);
    const result = paginateProducts(products, 1, 12);
    expect(result.totalPages).toBe(Math.ceil(50 / 12)); // 5
  });

  it('defaults to PRODUCTS_PER_PAGE when perPage omitted', () => {
    const products = makeProducts(50);
    const result = paginateProducts(products, 1);
    expect(result.items).toHaveLength(PRODUCTS_PER_PAGE);
  });
});
