# Feature: keep the product detail payload correct across SPA revisits

Status: in progress (`fix/detail-spa-revisit-stale-data`)
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

Pending Task 2.

## Commits

- `test(e2e): reproduce stale product payload on SPA revisit` (RED)
- `fix(detail): read the baked payload from the DOM, not from a one-shot inline script` (GREEN)
