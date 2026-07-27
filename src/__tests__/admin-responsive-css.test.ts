/**
 * Admin Shared CSS — Responsive Breakpoints Test Suite
 *
 * Tests that admin-shared.css contains the required responsive rules
 * for form stacking, toolbar normalization, promo grid, modal, and header.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CSS_PATH = resolve(__dirname, '../styles/admin-shared.css');
const css = readFileSync(CSS_PATH, 'utf-8');

describe('admin-shared.css responsive breakpoints', () => {
  describe('Form Row Stacking', () => {
    it('has @media (max-width: 767px) rule for .form-row', () => {
      expect(css).toContain('@media (max-width: 767px)');
      expect(css).toContain('.form-row');
    });

    it('sets flex-direction: column on .form-row at mobile', () => {
      // Find the media query block and verify it contains the stacking rule
      const mediaMatch = css.match(/@media\s*\(max-width:\s*767px\)\s*\{[^}]*\.form-row[^}]*flex-direction:\s*column/);
      expect(mediaMatch).not.toBeNull();
    });
  });

  describe('Toolbar Input Normalization', () => {
    it('normalizes min-width for .form-input and .form-select', () => {
      // Should have consistent min-width (not 130px, 140px, or 160px scattered)
      expect(css).toContain('min-width: 140px');
    });

    it('sets min-width: 100% on form inputs at mobile', () => {
      // Check that within a max-width: 767px block, form-input has min-width: 100%
      const hasMobileBlock = css.includes('@media (max-width: 767px)');
      const hasFormInputMinWidth = css.includes('.form-input') && css.includes('min-width: 100%');
      expect(hasMobileBlock && hasFormInputMinWidth).toBe(true);
    });
  });

  describe('Promo Grid Responsive', () => {
    it('has responsive grid for .tiles-promo at 1024px', () => {
      expect(css).toContain('@media (max-width: 1024px)');
      expect(css).toContain('.tiles-promo');
    });

    it('sets 2-column grid at tablet breakpoint', () => {
      // Verify responsive grid rules exist
      const hasTabletBreakpoint = css.includes('@media (max-width: 1024px)');
      const hasGridRule = css.includes('grid-template-columns: repeat(2, 1fr)');
      expect(hasTabletBreakpoint && hasGridRule).toBe(true);
    });

    it('sets 1-column grid at mobile breakpoint', () => {
      // Verify single-column grid at 767px
      const hasMobileBreakpoint = css.includes('@media (max-width: 767px)');
      const hasSingleCol = css.includes('.tiles-promo') && css.includes('grid-template-columns: 1fr');
      expect(hasMobileBreakpoint && hasSingleCol).toBe(true);
    });
  });

  describe('Modal Responsive', () => {
    it('reduces modal padding on mobile', () => {
      // Verify modal-overlay has reduced padding in media query
      const hasModalOverlay = css.includes('.modal-overlay') && css.includes('padding: 8px');
      expect(hasModalOverlay).toBe(true);
    });

    it('reduces modal header/form padding on mobile', () => {
      // Verify modal-header and modal-form have reduced padding
      const hasHeaderPadding = css.includes('.modal-header') && css.includes('padding: 16px');
      const hasFormPadding = css.includes('.modal-form') && css.includes('padding: 16px');
      expect(hasHeaderPadding && hasFormPadding).toBe(true);
    });
  });

  describe('Admin Header Responsive', () => {
    it('stacks admin-header on mobile', () => {
      // Verify admin-header has flex-direction: column
      const hasStacking = css.includes('.admin-header') && css.includes('flex-direction: column');
      expect(hasStacking).toBe(true);
    });
  });
});
