# Proposal: English Routes & Wishlist

## Intent

Spanish-only URLs (`/producto/:slug`, `/admin/nuevo`) hurt SEO; `/deseos` in the header 404s — no wishlist exists. Goal: canonical English routes with 301s, plus a localStorage wishlist mirroring cart with a live badge, working logged-out.

## Assumptions (pre-resolved)

1. Logged-out wishlist: `src/lib/wishlist.js`, key `wishlist`, items `{id, slug, name, price, image}`, events `storage` + `wishlist-updated`, `updateWishlistBadge()` wires `#wishlist-count`.
2. Migrate `/producto/:slug` → `/products/:slug`, `/deseos` → `/wishlist`, `/admin/nuevo` → `/admin/new`; `_redirects`: `/producto/* /products/:splat 301`, `/deseos /wishlist 301`, `/admin/nuevo /admin/new 301`.
3. Fix dead `/catalogo` (dashboard.astro) → `/`; `/admin/editar/:id` is another branch's work.
4. Page mirrors cart.astro: skeleton → empty state (icon, title, copy, CTA) → rows (image, name, `formatPrice`, aria-labeled remove, add-to-cart).
5. Badge caps "99+"; no max size.
6. Icon stays hidden <768px.
7. AGENTS.md docs updated.

## Scope

In: 3 route moves (git mv); `_redirects`; `wishlist.js` + `wishlist.test.ts` (TDD first); Header wiring (href, badge, `isCatalog`); reference sweep (product-card.js, AdminSidebar, dashboard, promotions, e2e selectors, 4 unit test paths, playwright.config, AGENTS.md); new `e2e/wishlist.spec.ts`; add-to-cart via existing helpers.
Out: backend wishlist, auth, WhatsApp for wishlist, cart redesign, AdminTable change, stale-item lookup (snapshots render as stored — design defers).

## Capabilities

New: `wishlist` (storage, `/wishlist` page, badge, add-to-cart); `routing` (English routes, 301s, `/catalogo` fix).
Modified: None — `openspec/specs/` empty.

## Approach

Exploration Approach 1 (cart mirror): pure functions in `wishlist.js`; page renders on `astro:page-load`; events sync badge; `git mv` preserves history; `_redirects` auto-copied to `dist/`.

## TDD (strict)

RED → GREEN → REFACTOR: `wishlist.test.ts` before markup; path-dependent tests same-commit as moves; e2e targets NEW routes only (`astro dev` ignores `_redirects`). Gate: `pnpm test` + `pnpm exec playwright test` green.

## Affected Areas

| Area | Impact |
|------|--------|
| `pages/products/[slug].astro`, `pages/admin/new.astro` | Moved |
| `pages/wishlist.astro`, `lib/wishlist.js`(+test), `_redirects`, `e2e/wishlist.spec.ts` | New |
| Header/AdminSidebar/dashboard/product-card/promotions/playwright.config/AGENTS.md; e2e catalog+responsive+detail-volume+promo-flows+helpers; tests getStaticPaths+detail-volume+variant-price-sync+admin-landing+escape-html | Modified |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Unit tests break on move | High | Same-commit updates |
| `isCatalog` prefix missed | Med | Sweep + e2e |
| Redirects unverifiable locally | Med | Post-deploy check |
| DB promo links → `/producto/` | Med | Splat rule |

## Rollback Plan

Revert commit: `git mv` back, delete `_redirects`, keep/drop wishlist lib (localStorage-only). Pages redeploys previous `main`.

## Dependencies

Cloudflare Pages `_redirects` (platform default); backend `promo.link` unchanged.

## Success Criteria

- [ ] New routes render; legacy URLs 301 (post-deploy)
- [ ] Wishlist covered by vitest + e2e
- [ ] `#wishlist-count` live, caps "99+"
- [ ] Grep clean of `/producto`, `/deseos`, `/admin/nuevo`, `/catalogo`
- [ ] `pnpm test` + `pnpm exec playwright test` pass
