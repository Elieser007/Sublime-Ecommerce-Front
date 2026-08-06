# Design: English Routes & Wishlist

## Technical Approach

Two workstreams on one branch: (1) route migration — `git mv` the three pages, ship `public/_redirects` 301 rules (Cloudflare Pages copies it into `dist/`), sweep every internal reference; (2) localStorage wishlist mirroring the cart pattern — pure functions in `src/lib/wishlist.js`, client-side render in `src/pages/wishlist.astro` on `astro:page-load`, Header badge sync via `storage` + `wishlist-updated`. Strict TDD: lib tests RED first, marker tests for page/Header wiring, path-dependent unit tests updated in the same commit as the moves. Gate: `pnpm test` + `pnpm exec playwright test` green. Per proposal assumption 2 and spec: routing + wishlist domains.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| Wishlist storage | 1) localStorage mirror (exploration rec.), 2) slug-refs + SSG join, 3) backend API | 1: zero backend, matches cart convention, works logged-out; 2: fresh prices but build drift + payload; 3: cross-device but violates "no backend in public pages", big scope | **1 — localStorage mirror** |
| Route moves | `git mv` vs copy+delete | `git mv` preserves history and is one atomic rename | **`git mv`**, tests updated same commit |
| Legacy `/producto/*` URLs (DB promo links) | `_redirects` splat vs rewriting backend `promo.link` | Splat: zero backend change, preserves any slug depth | **`_redirects`: `/producto/* /products/:splat 301`** |
| Wishlist add-to-cart | Reuse `addToCart` (cart.js), keep item in wishlist vs auto-remove | Keeping is simpler and non-destructive; user removes manually | **Reuse `addToCart`; item stays in wishlist** (proposal assumption 4) |
| Badge format | "99+" cap vs raw count, hidden at 0 | Mirrors `updateCartBadge()` visibility contract | **Cap "99+", `display:none` at 0** (proposal assumption 5) |
| Dead links | `/catalogo` → `/` (in-scope, dashboard) vs `/admin/editar/:id` (AdminTable) | `/catalogo` is dead on a page this change touches; `editar` is another branch's work | **Fix `/catalogo` → `/`; leave `editar`** (proposal assumption 3) |

## Data Flow

```
Header.astro ──href──▶ /wishlist
wishlist.js ◀──getWishlist()── localStorage['wishlist']
addToWishlist/removeFromWishlist ──saveWishlist──▶ dispatch 'storage'
wishlist.astro (astro:page-load) ──▶ rows/empty-state; dispatch 'wishlist-updated'
Header listeners ('storage' + 'wishlist-updated') ──▶ updateWishlistBadge() → #wishlist-count
add-to-cart: wishlist.astro ──addToCart({id,name,price,image})──▶ cart.js (cart badge updates)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/wishlist.js` | Create | Pure functions mirroring cart.js |
| `src/lib/wishlist.test.ts` | Create | TDD first; cart.test.ts mock pattern |
| `src/pages/wishlist.astro` | Create | Skeleton → empty state (icon, title, copy, CTA `/`) → rows (image, name, `formatPrice`, aria-labeled remove + add-to-cart); listens `storage` + `wishlist-updated` |
| `src/__tests__/wishlist-page.test.ts` | Create | Marker test: page + Header wiring (static-source, admin-landing pattern) |
| `public/_redirects` | Create | 3 rules: `/producto/* /products/:splat 301`, `/deseos /wishlist 301`, `/admin/nuevo /admin/new 301` |
| `src/pages/producto/[slug].astro` | Move | `git mv` → `src/pages/products/[slug].astro`; frontmatter comment `/producto/[slug]` → `/products/[slug]` (getStaticPaths returns only `params:{slug}` — URL derives from file location, no logic change) |
| `src/pages/admin/nuevo.astro` | Move | `git mv` → `src/pages/admin/new.astro`; `active="nuevo"` → `active="new"` |
| `src/components/Header.astro` | Modify | href `/deseos` → `/wishlist` (line 84); `isCatalog` prefix `/producto` → `/products` (line 23 + comment 11); import `updateWishlistBadge`, wire both listeners + page-load call (mirror cart badge lines 194–211); button stays hidden <768px |
| `src/components/product-card.js` | Modify | Link prefix `/producto/` → `/products/` (line 212) |
| `src/components/AdminSidebar.astro` | Modify | `activeSection === 'nuevo'` → `'new'` (line 223) |
| `src/pages/dashboard.astro` | Modify | `/admin/nuevo` → `/admin/new` (88); `/catalogo` → `/` (91) |
| `src/pages/admin/promotions.astro` | Modify | Placeholder `/producto/...` → `/products/...` (132) |
| `src/__tests__/getStaticPaths.test.ts` | Modify | Path → `../pages/products/[slug].astro` (20) |
| `src/__tests__/detail-volume.test.ts` | Modify | Path → `../pages/products/[slug].astro` (17) |
| `src/components/__tests__/variant-price-sync.test.ts` | Modify | Path → `../../pages/products/[slug].astro` (18) |
| `src/__tests__/admin-landing.test.ts` | Modify | `'nuevo'` → `'new'` in ADMIN_PAGES (21) |
| `src/lib/escape-html.test.ts` | Modify | Fixture `/catalogo/producto-1` → `/products/producto-1` (56, keeps sweep clean) |
| `e2e/catalog.spec.ts` | Modify | 4 refs: `a[href*="/producto/"]` → `/products/`, `waitForURL(/\/producto\//)` → `/\/products\//` (525,528,544,549) |
| `e2e/responsive.spec.ts` | Modify | Same pattern (350,355,361,377,390) |
| `e2e/detail-volume.spec.ts` | Modify | goto → `/products/camiseta-gimnasio` (6) |
| `e2e/admin/flows/promotions.spec.ts` | Modify | `VALID_PROMO_LINK` → `/products/remera-sublime-basica-algodon` (27) |
| `e2e/admin/helpers.ts` | Modify | `productCreate: "/admin/nuevo"` → `/admin/new` (46) |
| `e2e/wishlist.spec.ts` | Create | Mirrors cart.spec.ts: `addInitScript` seeding `localStorage["wishlist"]` |
| `playwright.config.ts` | Modify | Comment `/producto/:slug` → `/products/:slug` (72) |
| `AGENTS.md` | Modify | Route docs + folder structure (43, 146) |

## Interfaces / Contracts

```js
// src/lib/wishlist.js — WISHLIST_KEY = 'wishlist'
getWishlist()                    // [] on parse error (mirror getCart)
saveWishlist(list)               // module-private: setItem + dispatch 'storage'
addToWishlist(product)           // {id, slug, name, price, image}; dedupe by id; returns list
removeFromWishlist(id)           // filter + save; returns list
isInWishlist(id)                 // boolean
getWishlistCount()               // list.length
updateWishlistBadge()            // #wishlist-count: text = count > 99 ? '99+' : count; display none at 0
// Consumers dispatch 'wishlist-updated' after DOM-level mutations (cart-updated convention)
```

Item shape `{id, slug, name, price, image}` — `slug` enables row links to `/products/{slug}` and future sync (exploration approach-4 compatibility). `formatPrice` from `lib/format.ts`, `getProductImageUrl` from `lib/public-api.ts`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit RED→GREEN | `wishlist.test.ts`: empty→`[]`; add dedupe by id; remove; isInWishlist; count; 100 items→"99+"; 0 items→hidden; storage dispatched | cart.test.ts pattern (localStorage + window mocks; add minimal `document.getElementById` mock for badge) |
| Unit markers | `wishlist-page.test.ts`: wishlist.astro imports lib fns, listens both events, empty-state CTA, aria-labels; Header href `/wishlist`, listeners wired, isCatalog `/products` prefix, `#wishlist-btn` hidden <768px | Static-source (readFileSync), admin-landing.test.ts pattern |
| Unit updates | 4 hardcoded-path tests + escape-html fixture + `_redirects` static-source test (3 rules, 301, splat) | Same-commit as moves |
| E2E | `wishlist.spec.ts`: seeded rows render (name, formatted price), remove→empty state, add-to-cart→`#cart-count` updates, badge `#wishlist-count` shows seeded count, hidden <768px | cart.spec.ts `addInitScript` seed; targets `/wishlist` only (dev ignores `_redirects`) |
| E2E updates | catalog/responsive selectors+waitForURL, detail-volume goto, promotions constant, helpers map | New routes only |

## Threat Matrix

| Boundary | Applicability | Design response | RED tests |
|----------|---------------|-----------------|-----------|
| Documentation-like paths | N/A — no executable docs/scripts introduced; `_redirects` is a static routing file, not executed | — | — |
| Git repository selection | N/A — `git mv` with fixed worktree-root-relative paths, no `-C`/relative resolution logic | — | — |
| Commit state | N/A — no programmatic index manipulation; commits are human-triggered workflow steps | — | — |
| Push state | N/A — no push automation | — | — |
| PR commands | N/A — no PR automation | — | — |

Routing boundary response (no matrix row fits): `_redirects` content is asserted by a unit static-source test (3 rules, 301 status, `:splat` preserved); actual redirect behavior is Cloudflare-only, verified post-deploy per spec scenario (astro dev ignores `_redirects`). Failure behavior: missing/wrong rule → 404 on legacy URLs; mitigated by the static test + post-deploy check.

## Migration / Rollout

No data migration (new `wishlist` key). Rollout: single deploy; `_redirects` activates on Pages publish. Rollback: revert commit — `git mv` back, delete `_redirects`; wishlist lib is localStorage-only so it self-neutralizes.

## Sequencing (for sdd-tasks)

1. **T1** RED: `wishlist.test.ts` (fails — no lib) → **T2** GREEN: `wishlist.js`
2. **T3** RED markers: `wishlist-page.test.ts` (page + Header assertions) → **T4** GREEN: `wishlist.astro` + Header wiring (href, badge, listeners, isCatalog prefix)
3. **T5** Routes: `git mv` both pages + same-commit unit updates (getStaticPaths, detail-volume, variant-price-sync, admin-landing, escape-html fixture)
4. **T6** Sweep: product-card.js, AdminSidebar, dashboard (`/catalogo` → `/`), promotions placeholder
5. **T7** `public/_redirects` + static test
6. **T8** E2E: update 5 files + new `wishlist.spec.ts`
7. **T9** Docs: AGENTS.md + playwright.config comment
8. Gate: `pnpm test` && `pnpm exec playwright test`; grep clean of the four legacy paths outside `_redirects`/docs

## Open Questions

- [ ] Promo fixture slug mismatch (exploration risk): `VALID_PROMO_LINK` uses `remera-sublime-basica-algodon`, seeded products use `prod-...` prefix — verify during apply; prefer updating the constant to the seeded slug if the flow asserts navigation.
- [ ] `escape-html.test.ts` fixture update is optional realism but required for the clean-grep criterion — included.
