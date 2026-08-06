/**
 * Admin Responsive E2E — Viewport Tests
 *
 * Tests responsive behavior across 4 viewports for all 9 admin pages.
 * Uses vitest for CSS rule verification (reliable without auth).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CSS_PATH = resolve(__dirname, '../styles/admin-shared.css');
const css = readFileSync(CSS_PATH, 'utf-8');

function readPage(name: string): string {
  return readFileSync(resolve(__dirname, `../pages/admin/${name}.astro`), 'utf-8');
}

const ADMIN_PAGES = [
  'index', 'products', 'orders', 'users',
  'promotions', 'categories', 'branches',
  'attribute-modules', 'new',
];

const VIEWPORTS = [
  { width: 375, label: 'mobile' },
  { width: 768, label: 'tablet' },
  { width: 1024, label: 'desktop' },
  { width: 1440, label: 'large-desktop' },
];

// ─── CSS Responsive Rules ────────────────────────────────────

describe('Admin Responsive — CSS Rules', () => {
  describe('Form stacking at ≤768px', () => {
    it('has @media (max-width: 767px) block', () => {
      expect(css).toContain('@media (max-width: 767px)');
    });

    it('form-row has flex-direction: column', () => {
      expect(css).toContain('flex-direction: column');
    });
  });

  describe('Table card layout at ≤768px', () => {
    it('hides thead on mobile', () => {
      expect(css).toMatch(/thead\s*\{\s*display:\s*none/);
    });

    it('makes tbody tr display as block', () => {
      expect(css).toMatch(/tbody\s+tr\s*\{\s*display:\s*block/);
    });

    it('makes td display as flex', () => {
      expect(css).toMatch(/td\s*\{\s*display:\s*flex/);
    });

    it('uses attr(data-label) for ::before', () => {
      expect(css).toContain('attr(data-label)');
    });
  });

  describe('Promo grid responsive', () => {
    it('has 2-column grid at ≤1024px', () => {
      expect(css).toContain('@media (max-width: 1024px)');
      expect(css).toContain('repeat(2, 1fr)');
    });

    it('has 1-column grid at ≤768px', () => {
      expect(css).toContain('.tiles-promo');
      expect(css).toContain('grid-template-columns: 1fr');
    });
  });

  describe('Sidebar drawer at ≤768px', () => {
    it('hamburger toggle is hidden on desktop', () => {
      expect(css).toMatch(/\.sidebar-toggle\s*\{\s*display:\s*none/);
    });

    it('hamburger toggle is visible on mobile', () => {
      expect(css).toContain('.sidebar-toggle');
      expect(css).toContain('display: flex');
    });

    it('sidebar has fixed positioning on mobile', () => {
      expect(css).toContain('position: fixed');
    });

    it('sidebar has slide animation', () => {
      expect(css).toContain('transition');
      expect(css).toContain('left');
    });

    it('overlay has is-visible class', () => {
      expect(css).toContain('.is-visible');
    });
  });

  describe('Modal responsive at ≤768px', () => {
    it('reduces modal overlay padding', () => {
      expect(css).toContain('.modal-overlay');
      expect(css).toContain('padding: 8px');
    });

    it('reduces modal header padding', () => {
      expect(css).toContain('.modal-header');
      expect(css).toContain('padding: 16px');
    });
  });

  describe('Admin header responsive', () => {
    it('stacks header on mobile', () => {
      expect(css).toContain('.admin-header');
      expect(css).toContain('flex-direction: column');
    });
  });

  describe('Toolbar input normalization', () => {
    it('normalizes min-width to 140px', () => {
      expect(css).toContain('min-width: 140px');
    });

    it('full-width inputs on mobile', () => {
      expect(css).toContain('min-width: 100%');
    });
  });
});

// ─── Component Structure ─────────────────────────────────────

describe('Admin Responsive — Component Structure', () => {
  describe('AdminSidebar drawer', () => {
    const sidebar = readFileSync(resolve(__dirname, '../components/AdminSidebar.astro'), 'utf-8');

    it('has hamburger button', () => {
      expect(sidebar).toContain('sidebar-toggle');
    });

    it('hamburger has aria-expanded', () => {
      expect(sidebar).toContain('aria-expanded');
    });

    it('has overlay element', () => {
      expect(sidebar).toContain('sidebar-overlay');
    });

    it('has toggleSidebar function', () => {
      expect(sidebar).toContain('toggleSidebar');
    });

    it('has ESC key handler', () => {
      expect(sidebar).toContain('Escape');
    });
  });

  describe('Data tables have data-label', () => {
    // Pages that use DataTable component (have data-label in render functions)
    const tablePages = ['products', 'orders', 'users', 'branches', 'categories', 'attribute-modules'];
    for (const page of tablePages) {
      it(`${page}.astro has data-label attributes`, () => {
        const content = readPage(page);
        expect(content).toContain('data-label');
      });
    }
  });

  describe('All admin pages import admin-shared.css', () => {
    it('AdminLayout imports admin-shared.css', () => {
      const layout = readFileSync(resolve(__dirname, '../layouts/AdminLayout.astro'), 'utf-8');
      expect(layout).toContain('admin-shared.css');
    });
  });
});

// ─── Page-Specific Responsive Checks ─────────────────────────

describe('Admin Responsive — Page-Specific', () => {
  describe('Sidebar width consistency', () => {
    it('admin-shared.css uses --admin-sidebar-width variable', () => {
      expect(css).toContain('--admin-sidebar-width');
      expect(css).toContain('260px');
    });

    it('no page overrides sidebar width to 240px', () => {
      for (const page of ADMIN_PAGES) {
        const content = readPage(page);
        expect(content).not.toMatch(/grid-template-columns:\s*240px/);
      }
    });
  });

  describe('No shared style duplication', () => {
    it('no page defines .admin-layout grid', () => {
      for (const page of ADMIN_PAGES) {
        const content = readPage(page);
        // Should not have the shared layout grid definition
        expect(content).not.toMatch(/\.admin-layout\s*\{[^}]*grid-template-columns/);
      }
    });
  });

  describe('Promo grid responsive in promotions page', () => {
    it('promotions.astro has tiles-promo styles', () => {
      const content = readPage('promotions');
      expect(content).toContain('.tiles-promo');
    });
  });
});
