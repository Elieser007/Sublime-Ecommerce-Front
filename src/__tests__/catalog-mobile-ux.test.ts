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

  it('closeMobileSearchOverlay function exists', () => {
    expect(source).toMatch(/function\s+closeMobileSearchOverlay\s*\(\)/);
  });

  it('closeMobileSearchOverlay is called in mobile search form submit', () => {
    // Find the mobile search form submit handler
    const submitSection = source.substring(
      source.indexOf('const mobileSearchForm = mobileSearchInput?.closest(\'form\')')
    );
    const submitHandler = submitSection.substring(
      0,
      submitSection.indexOf('// ===== CLEAR FILTERS')
    );
    expect(submitHandler).toMatch(/closeMobileSearchOverlay\(\)/);
  });

  it('mobile search form submit handler calls render()', () => {
    const submitSection = source.substring(
      source.indexOf('const mobileSearchForm = mobileSearchInput?.closest(\'form\')')
    );
    const submitHandler = submitSection.substring(
      0,
      submitHandlerEndIndex(submitSection)
    );
    expect(submitHandler).toMatch(/render\(\)/);
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

  it('itemsPerPage state variable exists', () => {
    expect(source).toMatch(/let\s+itemsPerPage\s*=\s*24/);
  });

  it('per-page selector buttons exist in HTML', () => {
    expect(source).toMatch(/data-per-page="12"/);
    expect(source).toMatch(/data-per-page="24"/);
    expect(source).toMatch(/data-per-page="48"/);
  });

  it('per-page selector click handler exists', () => {
    expect(source).toMatch(/querySelectorAll\('\.per-page-option'\)\.forEach/);
    expect(source).toMatch(/btn\.addEventListener\('click'/);
  });

  it('mobile search bar input exists', () => {
    expect(source).toMatch(/id="mobile-search-bar-input"/);
    expect(source).toMatch(/class="mobile-search-bar"/);
  });

  it('mobile search bar input handler with debounce exists', () => {
    expect(source).toMatch(/mobile-search-bar-input/);
    expect(source).toMatch(/debounce|setTimeout.*300/);
  });

  it('clearAllFilters resets itemsPerPage', () => {
    const clearSection = source.substring(
      source.indexOf('function clearAllFilters()')
    );
    const clearEnd = clearSection.indexOf('render();');
    const clearBody = clearSection.substring(0, clearEnd + 10);
    expect(clearBody).toMatch(/itemsPerPage\s*=\s*24/);
  });

  it('paginateProducts uses itemsPerPage variable', () => {
    const paginateSection = source.substring(
      source.indexOf('function paginateProducts(products, page)')
    );
    const paginateEnd = paginateSection.indexOf('}');
    const paginateBody = paginateSection.substring(0, paginateEnd + 1);
    expect(paginateBody).toMatch(/itemsPerPage/);
  });
});

function submitHandlerEndIndex(section: string): number {
  // Find the end of the mobile search form submit handler
  const start = section.indexOf('mobileSearchForm.addEventListener');
  const sub = section.substring(start);
  // Count braces to find end of handler
  let depth = 0;
  let inHandler = false;
  for (let i = 0; i < sub.length; i++) {
    if (sub[i] === '{') { depth++; inHandler = true; }
    if (sub[i] === '}') { depth--; }
    if (inHandler && depth === 0) return start + i + 1;
  }
  return sub.length;
}
