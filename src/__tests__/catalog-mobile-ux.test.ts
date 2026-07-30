/**
 * Catalog Mobile UX — code-level tests for inline script behavior.
 *
 * These tests verify that critical `render()` calls and function
 * definitions exist in `src/pages/index.astro` inline script.
 * The inline JS cannot be unit-imported, so we verify source presence.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const INDEX_ASTRO = path.resolve(__dirname, '../pages/index.astro');
const source = fs.readFileSync(INDEX_ASTRO, 'utf-8');

describe('Mobile catalog UX — index.astro source', () => {
  it('mobile sort handler calls render() after setting currentSort', () => {
    // Find the mobile filter panel sort handler section
    const sortHandlerSection = source.substring(
      source.indexOf('filterPanel.querySelectorAll(\'[data-sort]\')')
    );
    const firstHandler = sortHandlerSection.substring(
      0,
      sortHandlerSection.indexOf('filterPanel.querySelector(\'#apply-filters-mobile\')')
    );
    // After currentSort = btn.dataset.sort, render() must be called
    expect(firstHandler).toMatch(/currentSort\s*=\s*btn\.dataset\.sort;[\s\S]*?render\(\)/);
    // Desktop sidebar sort buttons must be synced
    expect(firstHandler).toMatch(/document\.querySelectorAll\('\[data-sort\]'\)\.forEach\(\(b\)\s*=>\s*b\.classList\.remove\('active'\)\)/);
    expect(firstHandler).toMatch(/document\.querySelector\(`\[data-sort="\$\{currentSort\}"\]`\)\?\.classList\.add\('active'\)/);
  });

  it('escape key listener exists', () => {
    expect(source).toMatch(/document\.addEventListener\s*\(\s*['"]keydown['"]/);
    expect(source).toMatch(/e\.key\s*===\s*['"]Escape['"]/);
  });

  it('escape key checks category panel before filter panel', () => {
    const keydownSection = source.substring(
      source.indexOf('document.addEventListener(\'keydown\'')
    );
    const catCheck = keydownSection.indexOf('closeCategoriesPanel()');
    const filterCheck = keydownSection.indexOf('closeFiltersPanel()');
    expect(catCheck).toBeGreaterThan(-1);
    expect(filterCheck).toBeGreaterThan(-1);
    // Category panel check must come before filter panel
    expect(catCheck).toBeLessThan(filterCheck);
  });

  it('ROWS_PER_BATCH constant and getItemsPerPage function exist', () => {
    expect(source).toMatch(/const\s+ROWS_PER_BATCH\s*=\s*6/);
    expect(source).toMatch(/function\s+getItemsPerPage\(\)/);
  });

  it('mobile search bar input exists', () => {
    expect(source).toMatch(/id="mobile-search-bar-input"/);
    expect(source).toMatch(/class="mobile-search-bar"/);
  });

  it('mobile search bar input handler with debounce exists', () => {
    expect(source).toMatch(/mobile-search-bar-input/);
    expect(source).toMatch(/debounce|setTimeout.*300/);
  });

  it('clearAllFilters does not reset itemsPerPage (now dynamic)', () => {
    const clearSection = source.substring(
      source.indexOf('function clearAllFilters()')
    );
    const clearEnd = clearSection.indexOf('render();');
    const clearBody = clearSection.substring(0, clearEnd + 10);
    expect(clearBody).not.toMatch(/itemsPerPage\s*=\s*24/);
  });
});
