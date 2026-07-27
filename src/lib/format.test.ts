import { describe, it, expect } from 'vitest';
import { formatPrice } from './format';

describe('formatPrice', () => {
  it('formats number without decimals', () => {
    expect(formatPrice(135000)).toBe('135.000');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('0');
  });

  it('formats large numbers', () => {
    expect(formatPrice(1000000)).toBe('1.000.000');
  });

  it('formats small numbers', () => {
    expect(formatPrice(1500)).toBe('1.500');
  });

  it('formats negative numbers', () => {
    expect(formatPrice(-50000)).toBe('-50.000');
  });

  it('formats decimal input by rounding', () => {
    expect(formatPrice(120000.7)).toBe('120.001');
  });
});
