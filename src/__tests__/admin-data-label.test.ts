/**
 * Data-Label Attributes — Test Suite
 *
 * Tests that admin-shared.css contains responsive table CSS
 * and that admin pages include data-label attributes in table cells.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CSS_PATH = resolve(__dirname, '../styles/admin-shared.css');
const css = readFileSync(CSS_PATH, 'utf-8');

function readPage(name: string): string {
  return readFileSync(resolve(__dirname, `../pages/admin/${name}.astro`), 'utf-8');
}

describe('Responsive table CSS', () => {
  it('has .dt-table styles in admin-shared.css', () => {
    expect(css).toContain('.dt-table');
  });

  it('hides thead on mobile', () => {
    expect(css).toContain('thead');
    expect(css).toContain('display: none');
  });

  it('makes tbody tr display as block on mobile', () => {
    expect(css).toContain('tbody');
    expect(css).toContain('display: block');
  });

  it('makes td display as flex on mobile', () => {
    expect(css).toContain('td');
    expect(css).toContain('display: flex');
  });

  it('uses attr(data-label) for ::before pseudo-element', () => {
    expect(css).toContain('attr(data-label)');
  });
});

describe('data-label in admin pages', () => {
  const widget = readFileSync(resolve(__dirname, '../lib/data-table-widget.ts'), 'utf-8');

  it('the data-table widget emits data-label on every cell', () => {
    expect(widget).toContain('data-label=');
  });

  const pages = [
    { name: 'products', label: 'products-table' },
    { name: 'orders', label: 'orders-table' },
    { name: 'users', label: 'users-table' },
    { name: 'branches', label: 'branches-table' },
    { name: 'categories', label: 'createDataTable' },
    { name: 'attribute-modules', label: 'createDataTable' },
  ];
  for (const page of pages) {
    it(`${page.name}.astro wires the standard DataTable`, () => {
      const content = readPage(page.name);
      expect(content).toContain(page.label);
    });
  }
});
