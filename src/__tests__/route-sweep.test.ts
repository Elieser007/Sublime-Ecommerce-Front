/**
 * Route Sweep — Static Source Tests (REQ-routing-internal-references)
 *
 * Every internal reference must target the English routes. The old
 * Spanish paths are allowed only in public/_redirects and docs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const productCard = readFileSync(resolve(__dirname, '../components/product-card.js'), 'utf-8');
const dashboard = readFileSync(resolve(__dirname, '../pages/dashboard.astro'), 'utf-8');
const sidebar = readFileSync(resolve(__dirname, '../components/AdminSidebar.astro'), 'utf-8');
const promotions = readFileSync(resolve(__dirname, '../pages/admin/promotions.astro'), 'utf-8');

describe('product-card.js link prefix (REQ-routing-internal-references)', () => {
  it('links product cards to /products/{slug}', () => {
    expect(productCard).toContain('href="/products/${escapeHtml(product.slug)}"');
  });

  it('no longer uses the /producto prefix', () => {
    expect(productCard).not.toContain('/producto/');
  });
});

describe('dashboard.astro quick actions (REQ-routing-internal-references)', () => {
  it('links the new-product card to /admin/new', () => {
    expect(dashboard).toContain('href="/admin/new"');
    expect(dashboard).not.toContain('/admin/nuevo');
  });

  it('links the catalog card to /', () => {
    expect(dashboard).toContain('<a href="/" class="action-card">');
    expect(dashboard).not.toContain('/catalogo');
  });
});

describe('AdminSidebar active mapping (REQ-routing-internal-references)', () => {
  it('maps active="new" to the products section', () => {
    expect(sidebar).toContain("activeSection === 'new' ? 'products'");
    expect(sidebar).not.toContain("'nuevo'");
  });
});

describe('promotions.astro link placeholder (REQ-routing-internal-references)', () => {
  it('shows the /products/... placeholder', () => {
    expect(promotions).toContain('placeholder="/products/..."');
    expect(promotions).not.toContain('/producto/');
  });
});
