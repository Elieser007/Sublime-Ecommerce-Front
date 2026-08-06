# Tasks: English Routes & Wishlist

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~680 (600–700) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

- **U1 — Wishlist lib (T1–T2, PR 1, ~185)**: `pnpm test src/lib/wishlist.test.ts`; harness vitest (browser N/A — pure lib); rollback: revert lib files, no dependents.
- **U2 — Wishlist page + Header badge (T3–T4, PR 2, ~280)**: `pnpm test src/__tests__/wishlist-page.test.ts`; harness `pnpm dev` + `/wishlist`; rollback: revert wishlist.astro + Header.
- **U3 — Moves + unit updates + sweep + `_redirects` (T5–T7, PR 3, ~70)**: `pnpm test`; harness `pnpm build` + `dist/_redirects`; rollback: `git mv` back + delete `_redirects`.
- **U4 — E2E updates + wishlist spec + docs (T8–T9, PR 4, ~150)**: `pnpm exec playwright test e2e/wishlist.spec.ts`; harness Playwright :4321; rollback: revert e2e/ + AGENTS.md.

## Phase 1: Wishlist library (TDD)

- [x] **1.1 [T1 RED]** Write `src/lib/wishlist.test.ts` (cart.test.ts mocks): empty→`[]`; add dedupe by id; remove + `storage`; `isInWishlist`; count; 100→"99+"; 0→hidden.
- [x] **1.2 [T2 GREEN]** Create `src/lib/wishlist.js`: `getWishlist`, `saveWishlist` (setItem + `storage`), `addToWishlist` (dedupe id; `{id,slug,name,price,image}`), `removeFromWishlist`, `isInWishlist`, `getWishlistCount`, `updateWishlistBadge` (`#wishlist-count`; "99+" cap; hidden at 0). Dep: 1.1. AC: 1.1 green.

## Phase 2: Wishlist page + Header wiring (TDD markers)

- [x] **2.1 [T3 RED]** Write `src/__tests__/wishlist-page.test.ts` (static-source pattern): page imports lib fns, listens `storage`/`wishlist-updated`, CTA `/`, aria labels; Header href `/wishlist`, listeners, `isCatalog` `/products`, hidden <768px.
- [x] **2.2 [T4 GREEN]** Create `src/pages/wishlist.astro`: `astro:page-load` skeleton → empty state (icon/title/copy/CTA `/`) → rows (image, name, `formatPrice`, aria remove, add-to-cart via `addToCart`). Dep: 2.1, 1.2.
- [x] **2.3 [T4 GREEN]** `src/components/Header.astro`: href `/deseos`→`/wishlist` (84); page-load call + `storage`/`wishlist-updated` listeners → `updateWishlistBadge`; `isCatalog` `/producto`→`/products` (23). Dep: 2.2. AC: 2.1 green.

## Phase 3: Route migration + sweep + redirects

- [x] **3.1 [T5]** `git mv` under `src/pages/`: `producto/[slug].astro`→`products/[slug].astro`, `admin/nuevo.astro`→`admin/new.astro`; comment + `active="new"`.
- [x] **3.2 [T5, same commit]** Path updates → `../pages/products/[slug].astro`: `getStaticPaths.test.ts`, `detail-volume.test.ts`, `variant-price-sync.test.ts`; `admin-landing.test.ts` `'nuevo'`→`'new'`; `escape-html.test.ts` fixture. Dep: 3.1. AC: `pnpm test` green.
- [x] **3.3 [T6]** Sweep: `product-card.js` prefix; `AdminSidebar.astro` `'nuevo'`→`'new'`; `dashboard.astro` `/admin/new` + `/catalogo`→`/`; `promotions.astro` placeholder. Dep: 3.2. AC: grep clean.
- [x] **3.4 [T7]** Create `public/_redirects`: `/producto/* /products/:splat 301`, `/deseos /wishlist 301`, `/admin/nuevo /admin/new 301`.
- [x] **3.5 [T7]** `_redirects` static-source unit test (3 rules, 301, `:splat`; in `redirects.test.ts` or wishlist-page.test.ts). Dep: 3.4. AC: `dist/` contains rules.

## Phase 4: E2E + docs

- [x] **4.1 [T8]** E2E refs → new routes: `catalog.spec.ts`, `responsive.spec.ts` selectors + `waitForURL`; `detail-volume.spec.ts` goto; `promotions.spec.ts` `VALID_PROMO_LINK` (verify slug); `helpers.ts` `productCreate`; `playwright.config.ts` comment. Dep: 3.1.
- [x] **4.2 [T8]** Create `e2e/wishlist.spec.ts` (`addInitScript` seed): rows render name + price; remove→empty; add-to-cart→`#cart-count`; badge count; hidden <768px. Dep: 2.2.
- [x] **4.3 [T9]** Update `AGENTS.md` routes + structure: `/products/:slug`, `new`, `/wishlist`, `wishlist.js`, `_redirects`, `wishlist.spec.ts`. Dep: 3.1, 2.2.
- [x] **4.4 [Gate]** `pnpm test` + `pnpm exec playwright test` green; grep clean outside `_redirects`/docs. Dep: all.
