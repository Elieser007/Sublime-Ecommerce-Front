import { describe, it, expect } from 'vitest';
import { qtyDisplayWidth } from './qty-width';

describe('qtyDisplayWidth', () => {
  it('returns calc(1ch + 24px) for single digit', () => {
    expect(qtyDisplayWidth(1)).toBe('calc(1ch + 24px)');
  });

  it('returns calc(4ch + 24px) for 9999 (four digits)', () => {
    expect(qtyDisplayWidth(9999)).toBe('calc(4ch + 24px)');
  });

  it('returns calc(2ch + 24px) for two digits', () => {
    expect(qtyDisplayWidth(12)).toBe('calc(2ch + 24px)');
  });

  it('uses decimal string length for fractional values', () => {
    expect(qtyDisplayWidth(2.5)).toBe('calc(3ch + 24px)');
  });
});
