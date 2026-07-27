import { describe, it, expect } from 'vitest';
import { sortProducts } from './sort';

const makeProduct = (overrides: Record<string, any>) => ({
  id: '1',
  name: 'Test',
  slug: 'test',
  base_price: 100000,
  created_at: Date.now(),
  section_name: 'Section',
  category_name: 'Category',
  subcategory_name: null,
  image_url: null,
  price_tiers: [],
  ...overrides,
});

describe('sortProducts', () => {
  const products = [
    makeProduct({ id: '1', name: 'Remera', base_price: 135000, created_at: 3 }),
    makeProduct({ id: '2', name: 'Buzo', base_price: 95000, created_at: 2 }),
    makeProduct({ id: '3', name: 'Camisa', base_price: 120000, created_at: 1 }),
  ];

  it('returns original order for "default" sort', () => {
    const result = sortProducts([...products], 'default');
    expect(result.map((p) => p.id)).toEqual(['1', '2', '3']);
  });

  it('sorts by price ascending (menor precio)', () => {
    const result = sortProducts([...products], 'price-asc');
    expect(result.map((p) => p.base_price)).toEqual([95000, 120000, 135000]);
  });

  it('sorts by price descending (mayor precio)', () => {
    const result = sortProducts([...products], 'price-desc');
    expect(result.map((p) => p.base_price)).toEqual([135000, 120000, 95000]);
  });

  it('sorts by name alphabetically (Nombre A-Z)', () => {
    const result = sortProducts([...products], 'name');
    expect(result.map((p) => p.name)).toEqual(['Buzo', 'Camisa', 'Remera']);
  });

  it('handles empty array', () => {
    const result = sortProducts([], 'price-asc');
    expect(result).toEqual([]);
  });

  it('handles single product', () => {
    const single = [makeProduct({ id: '1', name: 'Test', base_price: 100 })];
    const result = sortProducts(single, 'price-desc');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('does not mutate the original array', () => {
    const original = [...products];
    sortProducts(products, 'price-asc');
    expect(products).toEqual(original);
  });

  it('sorts by name case-insensitively', () => {
    const mixed = [
      makeProduct({ id: '1', name: 'banana', base_price: 100 }),
      makeProduct({ id: '2', name: 'Apple', base_price: 200 }),
      makeProduct({ id: '3', name: 'cherry', base_price: 300 }),
    ];
    const result = sortProducts(mixed, 'name');
    expect(result.map((p) => p.name)).toEqual(['Apple', 'banana', 'cherry']);
  });
});
