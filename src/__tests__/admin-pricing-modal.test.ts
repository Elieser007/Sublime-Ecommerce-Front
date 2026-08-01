/**
 * Admin Pricing Modal — Error Surfacing (REQ-volume-pricing-3)
 *
 * Static-source tests on src/pages/admin/products.astro.
 * The pricing modal must surface backend error text inline on a failed
 * tier-add (no silent swallow, no refresh, no close), render it into a
 * dedicated #price-error element placed after the .price-form-row, and
 * clear that error on modal open and on success.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const PRODUCTS_PATH = resolve(__dirname, '../pages/admin/products.astro');
const products = readFileSync(PRODUCTS_PATH, 'utf-8');

// Bounded region of the add-price click handler: starts at the listener
// registration and ends at the status-toggle listener that follows it.
function addPriceHandlerRegion(): string {
  const start = products.indexOf("$('add-price-btn')?.addEventListener");
  const end = products.indexOf("$('status-confirm-activate')?.addEventListener");
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return products.slice(start, end);
}

describe('pricing modal error element', () => {
  it('renders a #price-error element after the .price-form-row', () => {
    const rowIdx = products.indexOf('price-form-row');
    const errorIdx = products.indexOf('id="price-error"');
    expect(rowIdx).toBeGreaterThan(-1);
    expect(errorIdx).toBeGreaterThan(rowIdx);
  });

  it('starts hidden so it does not flash on a clean open', () => {
    const match = products.match(/id="price-error"[^>]*>/);
    expect(match).not.toBeNull();
    expect(match![0]).toContain('hidden');
  });

  it('is announced as an alert for screen readers', () => {
    const match = products.match(/id="price-error"[^>]*>/);
    expect(match).not.toBeNull();
    expect(match![0]).toContain('role="alert"');
  });
});

describe('add-price failure path', () => {
  it('reads the backend .error from the parsed response body', () => {
    expect(addPriceHandlerRegion()).toContain('b?.error');
  });

  it('falls back to Spanish copy when the body has no error field', () => {
    expect(addPriceHandlerRegion()).toContain("'Error al guardar el precio'");
  });

  it('renders the message into #price-error and unhides it', () => {
    const region = addPriceHandlerRegion();
    expect(region).toContain('el.textContent = msg');
    expect(region).toContain('el.hidden = false');
  });

  it('does NOT close the modal on failure', () => {
    const region = addPriceHandlerRegion();
    expect(region).not.toContain('closePricingModal');
    expect(region).not.toContain('pricingModal.close');
  });

  it('does NOT refresh or reload the page on failure', () => {
    const region = addPriceHandlerRegion();
    expect(region).not.toContain('location.reload');
    expect(region).not.toContain('location.href');
  });

  it('hides #price-error again on success while reloading the tier list', () => {
    const region = addPriceHandlerRegion();
    expect(region).toContain('el.hidden = true');
    expect(region).toContain('loadPrices(pricingProductId)');
  });
});

describe('pricing modal error reset on open', () => {
  it('clears #price-error inside openPricing before the modal opens', () => {
    const start = products.indexOf('async function openPricing');
    const end = products.indexOf('async function loadPrices');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const openPricing = products.slice(start, end);
    expect(openPricing).toContain("$('price-error')");
    expect(openPricing).toContain('el.textContent = \'\'');
    expect(openPricing).toContain('el.hidden = true');
  });
});
