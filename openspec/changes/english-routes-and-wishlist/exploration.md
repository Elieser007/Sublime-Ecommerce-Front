# Exploration: english-routes-and-wishlist

Change: rename Spanish public/admin routes to English (/producto/:slug → /products/:slug, /deseos → /wishlist, /admin/nuevo → /admin/new), add SEO redirects, and implement the /wishlist page (localStorage pattern like cart + WhatsApp checkout).

## Current State

- SSG-only Astro 7 (output: 'static', no adapter). All public pages pre-rendered; admin pages are static shells with client-side auth guards.
- Routes today: `/` (catalog), `/home`, `/cart`, `/login`, `/register`, `/dashboard`, `/producto/[slug]`, `/admin/*` (index→meta-refresh→/admin/products, products, nuevo, categories, users, orders, promotions, branches, attribute-modules).
- NO `public/_redirects` file exists. astro.config.mjs defines NO redirects and NO trailingSlash (Astro default 'ignore'). Cloudflare Pages therefore serves 404 for any URL outside generated pages; a `public/_redirects` file is the mechanism for 301s (copied to dist/).
- `/deseos` link exists in Header.astro:84 but NO page — currently a 404 in production. The `#wishlist-count` badge (Header.astro:101) is dead markup (never updated by any script; only `#cart-count` is wired via `updateCartBadge()`).
- Wishlist button hidden on mobile (`#wishlist-btn { display:none }` at Header.astro:553, <768px). Cart button stays visible on mobile.
- Cart is the reference pattern: LocalStorage key `cart`, pure functions in `src/lib/cart.js`, events `storage` (dispatched by saveCart) + custom `cart-updated` (dispatched by consumers), header badge sync, WhatsApp checkout via `src/lib/whatsapp.ts` (wa.me link, phone 595991969608).
- Two dead links discovered (out of scope but related): `AdminTable.astro:54` links `/admin/editar/${product.id}` (no such page exists) and `dashboard.astro:91` links `/catalogo` (no such page; the catalog is `/`).
- Worktree note: `pnpm-workspace.yaml` has an unrelated local modification (worktree setup: esbuild/sharp allowBuilds=true).

## Route Inventory

| Route | Reference (file:line) | Action |
|-------|------------------------|--------|
| `/producto/:slug` | `src/pages/producto/[slug].astro` (page itself, comment line 3) | Rename → `src/pages/products/[slug].astro` |
| | `src/components/product-card.js:212` — `href="/producto/${escapeHtml(product.slug)}"` | Update to `/products/` |
| | `src/components/Header.astro:23` — `isCatalog` check `currentPath.startsWith('/producto')`; comment line 11 | Update prefix + comment |
| | `src/pages/admin/promotions.astro:132` — placeholder `placeholder="/producto/..."` | Update placeholder |
| | `e2e/catalog.spec.ts:525,528,544,549` — `a[href*="/producto/"]` + `waitForURL(/\/producto\//)` | Update selectors/regex |
| | `e2e/responsive.spec.ts:350,355,361,377,390` — same pattern | Update selectors/regex |
| | `e2e/detail-volume.spec.ts:6` — `page.goto("/producto/camiseta-gimnasio")` | Update URL |
| | `e2e/admin/flows/promotions.spec.ts:27` — `VALID_PROMO_LINK = "/producto/remera-sublime-basica-algodon"` | Update URL |
| | `src/__tests__/getStaticPaths.test.ts:20` — `resolve(__dirname, "../pages/producto/[slug].astro")` | Update path |
| | `src/__tests__/detail-volume.test.ts:17` — same | Update path |
| | `src/components/__tests__/variant-price-sync.test.ts:18` — same | Update path |
| | `playwright.config.ts:72` — comment "every /producto/:slug 404s" | Update comment |
| | `AGENTS.md:43,146` — docs | Update docs |
| | Backend-stored promo links (`promo.link` rendered by `src/components/promo/*.astro` via `href={promo.link}`) | Covered by `_redirects` `/producto/*` rule |
| `/deseos` | `src/components/Header.astro:84` — `href="/deseos"` (ONLY reference in repo) | Change href to `/wishlist`; create `src/pages/wishlist.astro` |
| `/admin/nuevo` | `src/pages/admin/nuevo.astro` (page; `<AdminSidebar active="nuevo" />` line 15) | Rename → `src/pages/admin/new.astro`, `active="new"` |
| | `src/pages/dashboard.astro:88` — `href="/admin/nuevo"` | Update |
| | `src/components/AdminSidebar.astro:223-224` — comment + `activeSection === 'nuevo' ? 'products'` mapping | Update mapping (e.g. `'new'`) |
| | `e2e/admin/helpers.ts:46` — `productCreate: "/admin/nuevo"` | Update (no flow uses productCreate today — defined only) |
| | `src/__tests__/admin-landing.test.ts:21` — `'nuevo'` in ADMIN_PAGES list | Update to `'new'` |
| `/catalogo` | `src/pages/dashboard.astro:91` — `href="/catalogo"` (dead link, no page) | Change to `/` |
| | `src/lib/escape-html.test.ts:56` — test fixture `"/catalogo/producto-1"` (string-only, no code) | Optional fixture update |
| `/admin/editar/:id` | `src/components/AdminTable.astro:54` — dead link (no page) | Product decision: fix or leave |
| Unchanged | `/`, `/home`, `/cart`, `/login`, `/register`, `/dashboard`, `/admin/*` (others), footer links (`Footer.astro:29` `/cart`) | — |

## SEO / Redirects

- No `public/_redirects` today; `astro.config.mjs` has no redirects/trailingSlash config. Confirmed.
- Cloudflare Pages syntax: `public/_redirects` → `/producto/* /products/:splat 301`, `/deseos /wishlist 301`, `/admin/nuevo /admin/new 301`. Splat preserves slug depth.
- Caveat: `astro dev` does NOT honor `_redirects`; E2E must target the NEW routes. Redirect behavior verifiable only post-deploy (or via preview).
- `/deseos` and `/admin/nuevo` previously 404'd in production, so 301s for them are cosmetic-SEO (no indexed URLs to protect); `/producto/*` 301 is the real SEO move.

## Test Impact

Unit (vitest, `pnpm test`):
- `src/__tests__/getStaticPaths.test.ts:20` — file path to moved page (must update or test breaks)
- `src/__tests__/detail-volume.test.ts:17` — same
- `src/components/__tests__/variant-price-sync.test.ts:18` — same
- `src/__tests__/admin-landing.test.ts:21` — 'nuevo' page list entry
- `src/lib/escape-html.test.ts:56` — optional fixture realism
- NEW (TDD): `src/lib/wishlist.test.ts` for the new wishlist lib (mirrors `cart.test.ts`); possibly header badge tests.

E2E (Playwright):
- `e2e/catalog.spec.ts` (4 refs), `e2e/responsive.spec.ts` (5 refs) — selectors + waitForURL
- `e2e/detail-volume.spec.ts:6` — goto
- `e2e/admin/flows/promotions.spec.ts:27` — promo link constant
- `e2e/admin/helpers.ts:46` — ADMIN_URLS map
- NEW: `e2e/wishlist.spec.ts` (mirrors `e2e/cart.spec.ts` localStorage seed pattern: `page.addInitScript` + `localStorage.setItem`)

## Cart Pattern (wishlist reference)

`src/lib/cart.js`:
- `CART_KEY = 'cart'`; `getCart()` JSON.parse + `migrateCart()` (try/catch → []); `saveCart()` → setItem + `window.dispatchEvent(new Event('storage'))`; `addToCart` (dedupe by id), `addToCartWithOptions` (dedupe by `composite_key` from `getCartKey(id, attributes)`); `getCartCount`; `updateCartQuantity` (calls `reevalTier`); `removeFromCart`; `clearCart`; `updateCartBadge()` updates `#cart-count` text/visibility.
- Events: window `storage` (fired by saveCart) + custom `cart-updated` (consumers dispatch after DOM-level mutations, e.g. cart.astro).
- Consumers: Header (listens storage + cart-updated → updateCartBadge), CartSummary (listens cart-updated → totals + WhatsApp href), cart.astro, product-card.js → variant-modal.js, [slug].astro.

`src/pages/cart.astro` structure: skeleton HTML → JS on `astro:page-load`: empty state (`renderEmptyState`: SVG icon + h2 + p + CTA button to `/` + continue-shopping link) or `renderItem` rows (image, name, attrs, `Gs. formatPrice()` prices, `<number-input>` qty web component with `data-label`, remove button with `aria-label`), `attachCartListeners` (number-input:change, animated remove), `:global()` styles, empty-state CSS, 44px touch targets (remove button 40px on desktop, mobile grid).

`src/lib/whatsapp.ts`: `buildCartMessage(cart)` (emoji header, per-item lines, tier notes, total, confirmation), `generateWhatsAppUrl(cart, phone)` ('#' when empty), `calculateCartTotals`, `formatGuaranies` → `formatPrice` (es-PY, no decimals). `WHATSAPP_PHONE = '595991969608'` (duplicated in CartSummary.astro:53 and [slug].astro:332).

Header badge precedent: `#cart-count` wired; `#wishlist-count` (Header.astro:101) exists but is never updated — the wishlist lib should add an `updateWishlistBadge()` mirroring `updateCartBadge()`.

## Approaches — Wishlist Storage

1. **localStorage mirror of cart (recommended)** — new `src/lib/wishlist.js` (pure functions: `getWishlist`, `addToWishlist`, `removeFromWishlist`, `isInWishlist`, `toggleWishlist`, `getWishlistCount`, `updateWishlistBadge`; key `wishlist`; items = product snapshots `{id, slug, name, price, image}`; events `storage` + custom `wishlist-updated`). Page `wishlist.astro` renders from storage; add-to-cart reuses `addToCart`/`addToCartWithOptions`; WhatsApp checkout reuses `buildCartMessage` (qty 1 items).
   - Pros: zero backend, matches cart pattern exactly (project convention), works logged-out, offline, instant; testable with vitest like `cart.test.ts`.
   - Cons: per-device (no cross-device sync), snapshot prices go stale until re-added, logic duplication with cart.js (shared helpers could be extracted).
   - Effort: Low-Medium.

2. **localStorage slug-references + SSG catalog join** — store only product ids/slugs; `wishlist.astro` is SSG with embedded catalog (like `/` at build time) and joins client-side.
   - Pros: fresh price/name/image at each build, tiny storage payload.
   - Cons: catalog HTML payload on the page, build-time drift between deploy and visit, more moving parts; over-engineering for current scale (~500 products).
   - Effort: Medium.

3. **Backend/API wishlist (auth-scoped)** — user wishlist via Better Auth + new backend endpoints.
   - Pros: cross-device, durable.
   - Cons: violates "no backend calls in public pages" convention, needs auth (icon is public today), backend + frontend scope, rate limits; large scope for this change.
   - Effort: High.

4. **Hybrid: localStorage now + API sync later** — implement (1) with a storage shape that can later sync (stable `id`-keyed items).
   - Pros: future-proof shape for minimal extra cost.
   - Cons: still only local for now.
   - Effort: Low (same as 1).

Recommendation: **Approach 1** (localStorage mirror), with item shape `{id, slug, name, price, image}` and the `updateWishlistBadge()` wiring. Add-to-cart from wishlist should route through existing `addToCart`/`addToCartWithOptions`; WhatsApp checkout reuses `buildCartMessage` with quantity-1 entries (or a small wishlist variant — design decision). Optionally keep shape compatible with future sync (approach 4 flavor).

## Risks

- 3 unit tests hard-code the `producto/` source path — they break the moment the folder moves; update in the same commit as the move.
- `astro dev` ignores `_redirects` — E2E cannot assert redirects; only new-route behavior. Redirect verification is post-deploy (Cloudflare Pages preview/production).
- Promo links stored in the backend DB (`promo.link`) may point at `/producto/...` — covered by the `_redirects` splat rule, but seeded data uses different slugs than helpers.ts seed list (`VALID_PROMO_LINK` uses `remera-sublime-basica-algodon` vs seeded `prod-remera-sublime-basica-algodon`); verify promo E2E fixtures during apply.
- Header `isCatalog` logic (home icon vs storefront) depends on the `/producto` prefix — forgetting it leaves the header icon wrong on product pages.
- Dead links discovered: `/admin/editar/:id` (AdminTable) and `/catalogo` (dashboard) — decide whether this change fixes them (cheap) or files separately.
- Wishlist items for deleted products (stale snapshots) — decide drop-on-open vs show-unavailable.
- AGENTS.md folder-structure docs are stale (mentions `e2e/admin.spec.ts` which no longer exists) — update the route sections as part of this change.

## Open Product Questions

1. Wishlist while logged out — localStorage works logged-out like cart; confirm that's desired (recommend yes).
2. Mobile: wishlist button is hidden <768px today; surface it on mobile (like cart) or keep hidden?
3. Badge cap/format for `#wishlist-count` (e.g. 99+)?
4. Max wishlist size (e.g. 100 items) or unlimited?
5. WhatsApp checkout from wishlist: whole list message vs per-item? (reuse `buildCartMessage` is cheapest)
6. Fix `/catalogo` (dashboard) and `/admin/editar/:id` dead links in this change or separately?

## Ready for Proposal

Yes. Proposal should cover: (a) file moves for the three routes, (b) `public/_redirects` with the three 301 rules, (c) new `src/lib/wishlist.js` + `src/pages/wishlist.astro` + Header wiring, (d) full reference sweep (table above), (e) test updates (unit paths + E2E selectors) and new TDD tests, (f) answers to the open product questions above.
