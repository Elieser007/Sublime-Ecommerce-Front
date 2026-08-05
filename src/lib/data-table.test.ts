/**
 * DataTable lib contract tests (RED)
 *
 * Pure logic for the standard admin DataTable:
 * - paginateData: client-side page slicing + indicator range
 * - sortData: stable, null-safe, numeric-aware sorting
 * - buildPageRange: windowed page buttons with ellipsis
 */

import { describe, it, expect } from 'vitest';
import { paginateData, sortData, buildPageRange } from './data-table';

describe('paginateData', () => {
  const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  it('returns the slice for the requested page', () => {
    const result = paginateData(rows, 1, 5);
    expect(result.pageRows).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns the slice for later pages', () => {
    const result = paginateData(rows, 3, 5);
    expect(result.pageRows).toEqual([11, 12]);
  });

  it('computes totalPages', () => {
    const result = paginateData(rows, 1, 5);
    expect(result.totalPages).toBe(3);
  });

  it('computes 1-based start and end for the indicator', () => {
    const result = paginateData(rows, 2, 5);
    expect(result.start).toBe(6);
    expect(result.end).toBe(10);
  });

  it('clamps the end to the last row on the final page', () => {
    const result = paginateData(rows, 3, 5);
    expect(result.start).toBe(11);
    expect(result.end).toBe(12);
  });

  it('clamps a page beyond the last page to the last page', () => {
    const result = paginateData(rows, 99, 5);
    expect(result.pageRows).toEqual([11, 12]);
    expect(result.start).toBe(11);
    expect(result.end).toBe(12);
  });

  it('clamps a page below 1 to page 1', () => {
    const result = paginateData(rows, 0, 5);
    expect(result.pageRows).toEqual([1, 2, 3, 4, 5]);
    expect(result.start).toBe(1);
  });

  it('clamps pageSize below 1 to 1', () => {
    const result = paginateData(rows, 1, 0);
    expect(result.totalPages).toBe(12);
    expect(result.pageRows).toEqual([1]);
  });

  it('handles an empty dataset with a single empty page', () => {
    const result = paginateData([], 1, 25);
    expect(result.pageRows).toEqual([]);
    expect(result.totalPages).toBe(1);
    expect(result.start).toBe(0);
    expect(result.end).toBe(0);
  });

  it('does not mutate the input array', () => {
    const input = [...rows];
    paginateData(input, 2, 5);
    expect(input).toEqual(rows);
  });
});

describe('sortData', () => {
  const items = [
    { id: 'a', name: 'Beta', price: 3000 },
    { id: 'b', name: 'alfa', price: 10 },
    { id: 'c', name: 'ñandú', price: null },
    { id: 'd', name: 'Águila', price: 250 },
    { id: 'e', name: 'Zorro', price: 1500 },
  ];

  it('sorts strings ascending with Spanish collation', () => {
    const result = sortData(items, 'name', 'asc');
    expect(result.map((r) => r.id)).toEqual(['d', 'b', 'a', 'c', 'e']);
  });

  it('sorts strings descending', () => {
    const result = sortData(items, 'name', 'desc');
    expect(result.map((r) => r.id)).toEqual(['e', 'c', 'a', 'b', 'd']);
  });

  it('sorts numbers numerically', () => {
    const result = sortData(items, 'price', 'asc');
    expect(result.map((r) => r.id)).toEqual(['b', 'd', 'e', 'a', 'c']);
  });

  it('sorts numbers descending', () => {
    const result = sortData(items, 'price', 'desc');
    expect(result.map((r) => r.id)).toEqual(['a', 'e', 'd', 'b', 'c']);
  });

  it('keeps null values last regardless of direction', () => {
    const asc = sortData(items, 'price', 'asc');
    const desc = sortData(items, 'price', 'desc');
    expect(asc[asc.length - 1].id).toBe('c');
    expect(desc[desc.length - 1].id).toBe('c');
  });

  it('is stable: equal values keep their original order', () => {
    const rows = [
      { id: 'x1', group: 1, pos: 1 },
      { id: 'x2', group: 1, pos: 2 },
      { id: 'x3', group: 2, pos: 3 },
    ];
    const result = sortData(rows, 'group', 'asc');
    expect(result.map((r) => r.id)).toEqual(['x1', 'x2', 'x3']);
  });

  it('does not mutate the input array', () => {
    const input = [...items];
    sortData(input, 'name', 'asc');
    expect(input).toEqual(items);
  });

  it('supports a custom value getter', () => {
    const result = sortData(items, 'name', 'asc', (row) => row.price);
    expect(result.map((r) => r.id)).toEqual(['b', 'd', 'e', 'a', 'c']);
  });

  it('returns a new array even when already sorted', () => {
    const result = sortData(items, 'name', 'asc');
    expect(result).not.toBe(items);
  });
});

describe('buildPageRange', () => {
  it('returns all pages when total fits in the window', () => {
    expect(buildPageRange(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it('returns a single page for one page', () => {
    expect(buildPageRange(1, 1)).toEqual([1]);
  });

  it('windows around the current page with first and last pinned', () => {
    expect(buildPageRange(10, 20)).toEqual([1, 'ellipsis', 9, 10, 11, 'ellipsis', 20]);
  });

  it('expands the window near the start edge', () => {
    expect(buildPageRange(1, 20)).toEqual([1, 2, 3, 'ellipsis', 20]);
  });

  it('expands the window near the end edge', () => {
    expect(buildPageRange(20, 20)).toEqual([1, 'ellipsis', 18, 19, 20]);
  });

  it('clamps the current page to the valid range', () => {
    expect(buildPageRange(99, 10)).toEqual([1, 'ellipsis', 8, 9, 10]);
  });

  it('honors a custom maxButtons', () => {
    expect(buildPageRange(10, 50, 5)).toEqual([1, 'ellipsis', 10, 'ellipsis', 50]);
  });

  it('honors a larger maxButtons', () => {
    expect(buildPageRange(10, 50, 9)).toEqual([1, 'ellipsis', 8, 9, 10, 11, 12, 'ellipsis', 50]);
  });
});
