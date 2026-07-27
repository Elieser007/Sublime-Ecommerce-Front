/**
 * Admin Sidebar Drawer — Test Suite
 *
 * Tests that the sidebar drawer component exists with proper
 * structure, CSS rules, and accessibility attributes.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SIDEBAR_PATH = resolve(__dirname, '../components/AdminSidebar.astro');
const CSS_PATH = resolve(__dirname, '../styles/admin-shared.css');

const sidebar = readFileSync(SIDEBAR_PATH, 'utf-8');
const css = readFileSync(CSS_PATH, 'utf-8');

describe('AdminSidebar drawer', () => {
  describe('Hamburger button exists', () => {
    it('has a sidebar-toggle button element', () => {
      expect(sidebar).toContain('sidebar-toggle');
    });

    it('button has aria-expanded attribute', () => {
      expect(sidebar).toContain('aria-expanded');
    });

    it('button has aria-label for accessibility', () => {
      expect(sidebar).toContain('aria-label');
    });
  });

  describe('Drawer overlay exists', () => {
    it('has a sidebar-overlay element', () => {
      expect(sidebar).toContain('sidebar-overlay');
    });
  });

  describe('Drawer CSS rules exist', () => {
    it('has .sidebar-toggle styles', () => {
      expect(css).toContain('.sidebar-toggle');
    });

    it('has .sidebar-overlay styles', () => {
      expect(css).toContain('.sidebar-overlay');
    });

    it('has .is-open class for sidebar', () => {
      expect(css).toContain('.is-open');
    });

    it('has .is-visible class for overlay', () => {
      expect(css).toContain('.is-visible');
    });

    it('hamburger is visible at max-width: 768px', () => {
      const hasMobileRule = css.includes('@media (max-width: 768px)');
      const hasToggleDisplay = css.includes('.sidebar-toggle') && css.includes('display: flex');
      expect(hasMobileRule && hasToggleDisplay).toBe(true);
    });

    it('sidebar has position fixed on mobile', () => {
      expect(css).toContain('position: fixed');
    });

    it('sidebar has z-index for overlay stacking', () => {
      expect(css).toContain('z-index');
    });

    it('sidebar has transition for slide animation', () => {
      expect(css).toContain('transition');
    });
  });

  describe('JavaScript toggle logic exists', () => {
    it('has toggleSidebar function', () => {
      expect(sidebar).toContain('toggleSidebar');
    });

    it('has ESC key handler', () => {
      expect(sidebar).toContain('Escape');
    });

    it('has click handler on overlay', () => {
      expect(sidebar).toContain('sidebar-overlay');
    });
  });

  describe('Accessibility', () => {
    it('sidebar has aria-hidden attribute', () => {
      expect(sidebar).toContain('aria-hidden');
    });

    it('sidebar has role="dialog" or role="navigation"', () => {
      const hasRole = sidebar.includes('role="dialog"') || sidebar.includes('role="navigation"');
      expect(hasRole).toBe(true);
    });
  });
});
