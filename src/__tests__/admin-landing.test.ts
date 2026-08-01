/**
 * Admin Landing Redirect + Sidebar Active State (REQ-admin-landing-1, -2)
 *
 * Static-source tests: /admin (src/pages/admin/index.astro) must redirect to
 * /admin/products via a zero-JS meta refresh and must NOT render the old
 * hardcoded placeholder product table. No admin page may pass
 * active="productos" (no matching data-section), and AdminSidebar must
 * expose data-section="products" for the destination section.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const PAGES_DIR = resolve(__dirname, '../pages/admin');
const index = readFileSync(resolve(PAGES_DIR, 'index.astro'), 'utf-8');
const sidebar = readFileSync(resolve(__dirname, '../components/AdminSidebar.astro'), 'utf-8');

const ADMIN_PAGES = [
  'index',
  'products',
  'nuevo',
  'categories',
  'users',
  'orders',
  'promotions',
  'branches',
  'attribute-modules',
];

function readAdminPage(name: string): string {
  return readFileSync(resolve(PAGES_DIR, `${name}.astro`), 'utf-8');
}

describe('/admin meta refresh redirect (REQ-admin-landing-1)', () => {
  it('serves a meta refresh to /admin/products', () => {
    expect(index).toContain('<meta http-equiv="refresh"');
    expect(index).toContain('url=/admin/products');
  });

  it('redirects immediately with no delay', () => {
    expect(index).toContain('content="0; url=/admin/products"');
  });

  it('keeps a no-JS fallback link to the destination', () => {
    expect(index).toContain('href="/admin/products"');
  });
});

describe('/admin no placeholder content (REQ-admin-landing-1)', () => {
  it('does not render the hardcoded placeholder products', () => {
    expect(index).not.toContain('Camiseta Sublime Básica');
    expect(index).not.toContain('placeholder-product.svg');
  });

  it('does not include the placeholder product table or its admin shell', () => {
    expect(index).not.toContain('AdminTable');
    expect(index).not.toContain('<table');
    expect(index).not.toContain('AdminLayout');
    expect(index).not.toContain('AdminSidebar');
  });
});

describe('sidebar active state (REQ-admin-landing-2)', () => {
  it('AdminSidebar defines a products section link', () => {
    expect(sidebar).toContain('data-section="products"');
    expect(sidebar).toContain('href="/admin/products"');
  });

  it('no admin page passes the unmatched active="productos"', () => {
    for (const page of ADMIN_PAGES) {
      const content = readAdminPage(page);
      expect(content).not.toContain('active="productos"');
    }
  });
});
