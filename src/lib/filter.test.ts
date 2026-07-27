import { describe, it, expect } from 'vitest';
import { filterByPrice, filterBySearch } from './filter';

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

describe('filterByPrice', () => {
  const products = [
    makeProduct({ id: '1', name: 'A', base_price: 50000 }),
    makeProduct({ id: '2', name: 'B', base_price: 100000 }),
    makeProduct({ id: '3', name: 'C', base_price: 150000 }),
    makeProduct({ id: '4', name: 'D', base_price: 200000 }),
  ];

  it('returns all products when no bounds given', () => {
    const result = filterByPrice(products, undefined, undefined);
    expect(result).toHaveLength(4);
  });

  it('filters by min price', () => {
    const result = filterByPrice(products, 100000, undefined);
    expect(result.map((p) => p.id)).toEqual(['2', '3', '4']);
  });

  it('filters by max price', () => {
    const result = filterByPrice(products, undefined, 150000);
    expect(result.map((p) => p.id)).toEqual(['1', '2', '3']);
  });

  it('filters by min and max price (range)', () => {
    const result = filterByPrice(products, 80000, 160000);
    expect(result.map((p) => p.id)).toEqual(['2', '3']);
  });

  it('returns empty when no products in range', () => {
    const result = filterByPrice(products, 300000, 400000);
    expect(result).toEqual([]);
  });

  it('handles empty array', () => {
    const result = filterByPrice([], 0, 100);
    expect(result).toEqual([]);
  });

  it('includes exact boundary values (inclusive)', () => {
    const result = filterByPrice(products, 100000, 100000);
    expect(result.map((p) => p.id)).toEqual(['2']);
  });

  it('handles min = 0 as no lower bound', () => {
    const result = filterByPrice(products, 0, 100000);
    expect(result.map((p) => p.id)).toEqual(['1', '2']);
  });
});

describe('filterBySearch', () => {
  const products = [
    makeProduct({ id: '1', name: 'Remera Sublime' }),
    makeProduct({ id: '2', name: 'Buzo Oversize' }),
    makeProduct({ id: '3', name: 'Camisa Linen' }),
    makeProduct({ id: '4', name: 'Remera Básica' }),
  ];

  it('returns all products for empty query', () => {
    const result = filterBySearch(products, '');
    expect(result).toHaveLength(4);
  });

  it('filters by partial name match (case-insensitive)', () => {
    const result = filterBySearch(products, 'remera');
    expect(result.map((p) => p.id)).toEqual(['1', '4']);
  });

  it('filters by exact name match', () => {
    const result = filterBySearch(products, 'Buzo Oversize');
    expect(result.map((p) => p.id)).toEqual(['2']);
  });

  it('returns empty for no match', () => {
    const result = filterBySearch(products, 'Zapatillas');
    expect(result).toEqual([]);
  });

  it('handles special characters in query', () => {
    const result = filterBySearch(products, 'Básica');
    expect(result.map((p) => p.id)).toEqual(['4']);
  });

  it('handles empty array', () => {
    const result = filterBySearch([], 'test');
    expect(result).toEqual([]);
  });

  it('matches substring anywhere in name', () => {
    const result = filterBySearch(products, 'linen');
    expect(result.map((p) => p.id)).toEqual(['3']);
  });
});
