# Feature: keep the product detail payload correct across SPA revisits

Status: ready to push on `fix/detail-spa-revisit-stale-data` (5 commits); push/PR/merge are the user's decision
Owner: orchestrator + user
Reported by: user — "cuando vas navegando llega un momento en el que no
funciona… tengo que recargarlo para que vuelva a funcionar"

## Problem

`<ClientRouter />` executes each script **once per document session**. Astro
keys the dedupe set by `src` (modules) or `textContent` (inline scripts):
`node_modules/astro/dist/transitions/swap-functions.js:28-45` populates
`scriptsAlreadyRan` and marks repeats with `data-astro-exec="";`
`node_modules/astro/dist/transitions/router.js:72-100` (`runScripts`) skips
them. A hard reload resets the set, which is why reloading "fixes" it.

The detail page injects its build-time payload through **inline** scripts:

- `src/pages/products/[slug].astro:186` — `window.__PRODUCT_DATA__`
- `src/pages/products/[slug].astro:188` — `window.__VARIANTS_DATA__`

Each product's payload is a different string, so the first visit to a product
runs its script and the payload lands on `window`. On a **second** visit to the
same product through SPA navigation the text was already seen, the script is
skipped, and `initDetailPage()` (`:364-365`) binds the *previous* product's
data to the new product's DOM.

The comment at `:203` already accounts for the module-bundle dedupe (elements
and data are re-resolved on every `astro:page-load`); it missed that inline
scripts are deduped by text as well.

### Impact (reproduced on local preview and on https://sublimepy.store)

Flow: Abanicos (Gs. 19.000) → Alcancía → back to Abanicos, all SPA.

| Step | URL | H1 | `__PRODUCT_DATA__.slug` | Price shown | Add to cart |
| --- | --- | --- | --- | --- | --- |
| direct | /products/abanicos-… | Abanicos | abanicos | Gs. 19.000 | Abanicos |
| A→B | /products/alcancia-… | Alcancía | alcancia | Gs. 13.000 | Alcancía |
| **B→A** | /products/abanicos-… | **Abanicos** | **alcancia** | **Gs. 13.000** | **Alcancia Personalizada x2** |
| reload | /products/abanicos-… | Abanicos | abanicos | Gs. 19.000 | Abanicos |

Wrong price, wrong variant graph, and the **wrong product with the wrong price
added to the cart**. When the previously visited product is baked as
`bakeFailed`/variant-gated, `variantUi.showFallbackNotice` blocks the click and
the button appears dead until reload.

## Plan

- [x] Task 1 — e2e regression spec `e2e/detail-revisit.spec.ts`: land on a
      product, SPA to a second product, SPA back, compare the revisited page
      against its own first-visit baseline. Assert the navigation really was
      SPA (a full load would make the test pass vacuously). Observe RED.
- [x] Task 2 — move the payload to inert DOM: `<script type="application/json"
      id="product-data">` / `id="variants-data"`, read with `JSON.parse` inside
      `initDetailPage()`. Update the static contract test in
      `src/__tests__/detail-volume.test.ts`. Observe GREEN.
- [x] Task 3 — record verification evidence and close.

## Design notes

`type="application/json"` is never executed, so the ClientRouter dedupe cannot
skip it, and the payload travels with the swapped DOM — the same reason
`astro:page-load` handlers already re-resolve elements per navigation. The
alternative (`data-astro-rerun` on both `is:inline` scripts) fixes the symptom
but keeps two pages' worth of mutable globals in one window.

## Evidence

### RED — `npx playwright test e2e/detail-revisit.spec.ts --project=chromium`

```
1) [chromium] › e2e/detail-revisit.spec.ts:47:3 › revisited product renders its own price and name
  Error: expect(locator).toHaveText(expected) failed
  Locator:  locator('#detail-price')
  Expected: "Gs. 230.000"
  Received: "Gs. 770.000"
```

`#detail-name` (server-rendered) matched, `__spaTag` survived every step
(client-side navigation confirmed), and only the payload-derived price was
stale — the product B value on product A's page.

### GREEN

`npx playwright test e2e/detail-revisit.spec.ts --project=chromium`

```
✓ 1 [chromium] › Product detail — SPA revisit › revisited product renders its own price and name
1 passed (20.0s)
```

Regression battery after the fix — `detail-volume`, `detail-revisit`, `catalog`,
`cart`, `wishlist` (chromium): **80 passed (1.3m)**.

`npm test` (vitest): **70 files / 1351 tests passed**.

Production mode: `npm run build` (104 pages, backend on :8787) + `astro preview`,
then the A→B→A flow with add-to-cart on the built output:

| Step | URL | Price shown | Cart after click |
| --- | --- | --- | --- |
| A direct | /products/combo-cumple-infantil-1 | Gs. 230.000 | Combo Cumple Infantil 1 x1 |
| A→B SPA | /products/combo-cumple-infantil-10 | Gs. 770.000 | Combo Cumple Infantil 10 x1 |
| **B→A SPA** | /products/combo-cumple-infantil-1 | **Gs. 230.000** | **Combo Cumple Infantil 1 x2** |

The built page also carries a valid `application/json` payload for both ids and
no `window.__*_DATA__` assignment. The cart assertion is scoped to option-free
products (a product with variants needs a selection before add-to-cart), which
is why the spec documents that precondition.

## Commits

- `50e16b5` test(e2e): reproduce stale product payload on SPA revisit (RED)
- `d7ccb7c` fix(detail): read the baked payload from the DOM, not from one-shot inline scripts (GREEN)
- `93eda47` docs(odd): record the product-detail SPA revisit fix and its evidence

## Follow-up round (after the first review)

The native review approved the change with one advisory finding, and the user
asked for both follow-ups on the same branch before pushing.

- [x] Task 4 — `R3-001`: `readBakedPayload` degrades in silence. Warn on a
      missing/corrupt payload and make the blocked state explicit instead of
      leaving an apparently active button that does nothing.
- [x] Task 5 — delete the dead `is:inline` script in `src/pages/home.astro:113`
      (same shape; it assigned `el.product` while `product-card` reads the
      `product` attribute) and guard the featured grid with an e2e check.
- [x] Task 6 — full battery + production build/preview + fresh native review
      on the new candidate.

### Evidence — Task 4

New e2e in `e2e/detail-revisit.spec.ts`: removes `#product-data` and
`#variants-data`, re-runs the page script through `astro:page-load`, and
asserts the warning plus the blocked controls.

- **RED**: `Expected substring: "product-data" / Received string: ""` — not a
  single warning; the add-to-cart stayed enabled and inert.
- **GREEN**: both specs in the file pass. In the production build the state is
  `warn=SI {"disabled":true,"label":"Producto no disponible","wa":"true"}`.

### Evidence — Task 5

`e2e/home.spec.ts` guards the surviving contract (attribute-driven render + the
modal opening). It passed **before** the deletion (so the guard is not vacuous)
and after: `cards=8 nombre="Combo Cumple Infantil 1" modal=true` on the built
preview. The deleted helper was dead code — `ProductCard` reads the `product`
attribute in `connectedCallback` and defines no `product` accessor.

### Verification — round 2

| Check | Result |
| --- | --- |
| Public e2e battery (home, detail-revisit, detail-volume, catalog, cart, wishlist, responsive) | **151 passed (1.7m)** |
| `npm test` (vitest) | **70 files / 1351 tests passed** |
| Production build (104 pages) + `astro preview` | revisit `Gs. 230.000` + correct cart item, missing-payload blocked state, `/home` grid + modal, **0 pageerrors** |

### Commits — round 2

- `0cc67be` fix(detail): never let a missing baked payload pass as a live button
- `3d37104` chore(home): drop the dead product-card init script

## Not in scope

- Any future per-page SSG payload must use the inert-JSON pattern; an
  `is:inline` assignment will silently break again on the second SPA visit to
  that route.
