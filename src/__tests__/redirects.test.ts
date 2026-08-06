/**
 * Legacy Route Redirects — Static Source Tests (REQ-routing-legacy-redirects)
 *
 * public/_redirects is copied verbatim into dist/ by Cloudflare Pages.
 * These tests assert the exact 301 rules for the renamed Spanish routes.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const redirects = readFileSync(resolve(__dirname, '../../public/_redirects'), 'utf-8');

describe('public/_redirects legacy route rules', () => {
  it('contains exactly the three legacy redirect rules', () => {
    const rules = redirects.split('\n').map((line) => line.trim()).filter(Boolean);
    expect(rules).toHaveLength(3);
  });

  it('301s /producto/* to /products/:splat preserving the slug', () => {
    expect(redirects).toContain('/producto/* /products/:splat 301');
  });

  it('301s /deseos to /wishlist', () => {
    expect(redirects).toContain('/deseos /wishlist 301');
  });

  it('301s /admin/nuevo to /admin/new', () => {
    expect(redirects).toContain('/admin/nuevo /admin/new 301');
  });
});
