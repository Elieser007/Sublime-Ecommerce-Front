/**
 * Admin Shared CSS — Test Suite
 *
 * Tests that admin-shared.css exists, is importable,
 * and contains the shared styles extracted from admin pages.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const CSS_PATH = resolve(__dirname, '../styles/admin-shared.css');
const ADMIN_LAYOUT_PATH = resolve(__dirname, '../layouts/AdminLayout.astro');

describe('admin-shared.css', () => {
  it('exists at src/styles/admin-shared.css', () => {
    expect(existsSync(CSS_PATH)).toBe(true);
  });

  it('contains admin layout grid rules', () => {
    const css = readFileSync(CSS_PATH, 'utf-8');
    expect(css).toContain('.admin-layout');
    expect(css).toContain('grid-template-columns');
  });

  it('contains modal overlay styles', () => {
    const css = readFileSync(CSS_PATH, 'utf-8');
    expect(css).toContain('.modal-overlay');
    expect(css).toContain('.modal');
  });

  it('contains form input styles', () => {
    const css = readFileSync(CSS_PATH, 'utf-8');
    expect(css).toContain('.form-input');
    expect(css).toContain('.form-select');
    expect(css).toContain('.form-textarea');
  });

  it('contains button styles', () => {
    const css = readFileSync(CSS_PATH, 'utf-8');
    expect(css).toContain('.btn');
    expect(css).toContain('.btn--primary');
    expect(css).toContain('.btn--secondary');
  });

  it('contains global button rule blocks for JS-injected markup (REQ-6)', () => {
    const css = readFileSync(CSS_PATH, 'utf-8');
    // Rule BLOCKS (selector followed by `{`), not mere mentions in comments —
    // JS template literals rely on these global styles applying.
    expect(css).toMatch(/\.btn--primary\s*\{/);
    expect(css).toMatch(/\.btn--danger\s*\{/);
    expect(css).toMatch(/\.btn--sm\s*\{/);
    expect(css).toMatch(/\.badge--sm\s*\{/);
  });

  it('contains badge styles', () => {
    const css = readFileSync(CSS_PATH, 'utf-8');
    expect(css).toContain('.badge');
    expect(css).toContain('.badge--active');
    expect(css).toContain('.badge--inactive');
  });

  it('contains toolbar styles', () => {
    const css = readFileSync(CSS_PATH, 'utf-8');
    expect(css).toContain('.toolbar');
    expect(css).toContain('.content-header');
  });

  it('contains .form-input--sm modifier for inline modal rows', () => {
    const css = readFileSync(CSS_PATH, 'utf-8');
    expect(css).toMatch(/\.form-input--sm\s*\{/);
    expect(css).toMatch(/\.form-input--sm\s*\{[^}]*width:\s*80px/s);
    expect(css).toMatch(/\.form-input--sm\s*\{[^}]*min-width:\s*0/s);
  });

  it('contains global rule blocks for AttributeManager injected markup (injected-attr-styles)', () => {
    const css = readFileSync(CSS_PATH, 'utf-8');
    // Rule BLOCKS (selector followed by `{`), not mere mentions in comments —
    // AttributeManager injects these via innerHTML, so scoped styles never apply.
    expect(css).toMatch(/\.attr-value-row\s*\{/);
    expect(css).toMatch(/\.attr-value-price\s+input\s*\{/);
    expect(css).toMatch(/\.attr-empty-state\s*\{/);
    expect(css).toMatch(/\.attr-picker-item\s*\{/);
  });

  it('does not resurrect the removed scoped attr-picker-btn class', () => {
    const css = readFileSync(CSS_PATH, 'utf-8');
    expect(css).not.toContain('attr-picker-btn');
  });
});

describe('admin-shared.css covers shared selectors from products.astro', () => {
  it('contains all shared layout selectors', () => {
    const css = readFileSync(CSS_PATH, 'utf-8');
    const sharedSelectors = [
      '.admin-layout', '.admin-main', '.admin-header',
      '.content-header', '.toolbar',
      '.form-input', '.form-select', '.form-textarea', '.form-row', '.form-group',
      '.empty-cell', '.cell-actions',
      '.slug-display', '.tag', '.tag--section',
      '.pagination-bar', '.page-nav',
      '.modal-overlay', '.modal', '.modal--wide', '.modal-header', '.modal-close',
      '.modal-form', '.modal-body',
      '.form-error', '.form-actions',
      '.upload-input', '.upload-status', '.upload-info', '.cmyk-bar',
      '.modal--confirm', '.delete-message',
    ];
    for (const selector of sharedSelectors) {
      expect(css, `admin-shared.css missing selector: ${selector}`).toContain(selector);
    }
  });
});

describe('AdminLayout imports admin-shared.css', () => {
  it('AdminLayout.astro file exists', () => {
    expect(existsSync(ADMIN_LAYOUT_PATH)).toBe(true);
  });

  it('AdminLayout imports admin-shared.css', () => {
    const layout = readFileSync(ADMIN_LAYOUT_PATH, 'utf-8');
    expect(layout).toContain('admin-shared.css');
  });
});
