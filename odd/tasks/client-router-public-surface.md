# Feature: re-arm component scripts after a ClientRouter navigation

Status: implemented, verified, committed on `fix/client-router-public-surface`
(3 commits); push/PR/merge are the user's decision
Owner: orchestrator + user
Reported by: user — "cuando entro a un producto, voy atrás para volver al
catálogo y entro en otro: la galería de imágenes no funciona, parece que al
volver hacia atrás el JS ya no se carga"

## Problem

`<ClientRouter />` executes each **bundled component script at most once per
document session**. Astro keys the dedupe set by `src` (module scripts) or
`textContent` (inline scripts):

- `node_modules/astro/dist/transitions/swap-functions.js:26-45` —
  `detectScriptExecuted()` fills `scriptsAlreadyRan` and `deselectScripts()`
  marks repeats with `data-astro-exec=""`.
- `node_modules/astro/dist/transitions/router.js:83` — `runScripts()` does
  `if (script.dataset.astroExec === "") continue;`, so the marked script is
  never re-created and never evaluated.

Astro bundles each `.astro` component script to a **stable URL**, identical on
every page that renders that component. Proof from the committed build:

```
$ for d in agenda-2026 almohadon-estampado-40x40; do \
    grep -o 'src="/_astro/[^"]*\.js"' dist/products/$d/index.html; done | sort -u
/_astro/ProductGallery.astro_astro_type_script_index_0_lang.ELs7ECxT.js   ← same URL
/_astro/BaseLayout.astro_astro_type_script_index_0_lang.BMz5J5By.js
/_astro/_slug_.astro_astro_type_script_index_0_lang.C6ugNrON.js
```

Consequence: a component script that wires the DOM at **module scope** runs on
the first page that renders it and never again for the rest of the SPA
session. A hard reload resets the set — which is exactly the user's "parece
que al volver hacia atrás el JS ya no se carga".

This is the same root cause as `odd/tasks/product-detail-spa-revisit.md`, but
that fix corrected the *page-level* scripts (which subscribe to
`astro:page-load`). The **component-level** scripts were left at module scope.

### Inventory (read-verified)

Rendered (real bugs):

| Component | Rendered by | Wiring | User-visible damage on revisit | Status |
| --- | --- | --- | --- | --- |
| `src/components/ProductGallery.astro` | `src/pages/products/[slug].astro:109` | module scope | thumbs/arrows/lightbox dead | in scope (reported) |
| `src/components/promo/CarouselPromo.astro` | `PromotionWall` when a section's `displayType === 'carousel'` | module scope (`:96`) | arrows/dots/autoplay dead | in scope (latent) |

Inactive files (zero importers — verified by grep over `src/` and `e2e/`), so their
module-scope wiring never executes and cannot be user-visible. **Left untouched**:

| File | Why it is inactive |
| --- | --- |
| `src/components/product/VariantSelector.astro` | the live selector is the `variant-selector` custom element created by `renderVariantSelector()` (`[slug].astro:304`) from `src/components/variant-selector.js` (element lifecycle, SPA-safe). Kept as an inactive contract fixture by `src/components/__tests__/VariedadSelector.test.ts` and `src/__tests__/token-compliance.test.ts`. |
| `src/components/CategoryFilter.astro` | superseded; the catalog filters are wired by `src/pages/index.astro` `initCatalog()`. Zero importers. |

Follow-up (same shape, admin surface, out of scope by user decision):
`src/components/admin/{AttributeManager,DependencyForm,AdminProductForm,ImageUploader}.astro`.

### Local data used by the regressions

`ProductGallery` renders a thumbnail strip only for products with more than one
image; the seeded local catalog has `galeria-7-imagenes-fixed` (10),
`bug-galeria-7-imagenes` (5) and `remera-premium-estampada` (2). The lightbox
toggle exists for every product, so the spec can assert either signal. All local
`promotion_section` rows have `display_type = 'tiles'`, so **`CarouselPromo`
cannot be driven by e2e in this repository** without a Back-repo seed change
(recorded as a follow-up).

## Required pattern

The repo already owns the fix (`src/pages/products/[slug].astro:203-260,515-518`,
`src/pages/index.astro:817`, cart, wishlist, login, admin pages):

1. All DOM queries happen **inside** `initX()`, never at module scope.
2. `initX()` is registered with `document.addEventListener('astro:page-load',
   window.__xInit)` — the document object survives body swaps, so the listener
   keeps firing even though the module is evaluated once.
3. Re-registration removes the previous listener first
   (`window.__xInit`), so listeners never stack.
4. Per-page listeners that must not stack (e.g. `document` keydown) are
   replaced through a `window.__xHandler` slot, as
   `src/components/PriceTierList.astro:115-119` already does.

## Tasks

- [x] Task 1 — RED: Playwright regression proving the dead wiring on the
      second SPA visit (`e2e/spa-wiring-revisit.spec.ts`).
- [x] Task 2 — GREEN: `ProductGallery.astro` and `CarouselPromo.astro` moved
      to the `astro:page-load` pattern; first-load behaviour unchanged.
- [x] Task 3 — Verify: focused spec x3, public e2e battery, `npm test`,
      production build, production-artifact smoke, carousel probe.
- [x] Task 4 — Work-unit commits + native review candidate.

## Evidence

### RED → GREEN (the reported bug)

`e2e/spa-wiring-revisit.spec.ts`, run before the fix (independent run in a
pre-fix worktree, static build served by `astro preview`):

```
clicking a thumbnail must swap the main image
  Expected: "...1785535517083-b7ffd5de....webp"
  Received: "...1785535516898-8c9b920e....webp"
```

Main image never swapped on the second SPA-visited product — the gallery was
dead, exactly as reported. Every `__spaTag` and precondition assertion above
it passed, so the failure is the wiring and not the navigation. After the fix
the same spec passes on the dev server and on the production artifact.

### Verification

| Check | Command | Result |
| --- | --- | --- |
| Stability | `playwright test e2e/spa-wiring-revisit.spec.ts --repeat-each=3` | 3 passed (17.5s / 16.9s / 16.4s) |
| Public battery (dev) | `playwright test e2e/{cart,catalog,detail-volume,detail-revisit,home,responsive,spa-wiring-revisit,wishlist}.spec.ts` | **152 passed (1.6m)** |
| Unit | `npm test` | 71 files / 1353 tests passed |
| Production build | `PUBLIC_API_URL=http://localhost:8787 npm run build` | 104 pages, 0 errors |
| Production artifact | `astro preview` + focused spec via a `/tmp` config | 1 passed (13.3s test), `PAGEERRORS: []`, no gallery-related console errors |
| Carousel probe | temporary `display_type='carousel'` + second promo row in the local D1, restored afterwards | arrows/dots move the slide on the **second** SPA visit, `data-carousel-init` set once, no stacked interval; DB restored verbatim |

### Known verification gaps (not hidden)

- No pre-fix RED for the carousel path: it shares the gallery's mechanism, but
  the carousel itself was only proven green after the fix.
- The carousel has no committed e2e because every local `promotion_section` row
  is `display_type='tiles'`; a regression spec needs a Back-repo seed change
  (`scripts/seed-e2e.ts`) that creates a carousel section with 2+ promotions.
- `src/__tests__/client-router-script-wiring.test.ts` is a source-containment
  guard, not behavioural proof — the e2e file carries the behaviour.

## Commits

- `f522aeb` test(e2e): prove the gallery goes dead on the second SPA product (RED)
- `30d3228` fix(gallery): re-arm the gallery wiring on every astro:page-load (GREEN)
- `4fce62b` fix(carousel): re-arm the promo carousel per page-load + wiring guard

## Verification plan (as run)

| Check | Command |
| --- | --- |
| Focused RED/GREEN | `npx playwright test e2e/spa-wiring-revisit.spec.ts` |
| Public battery | `npx playwright test e2e/cart.spec.ts e2e/catalog.spec.ts e2e/detail-volume.spec.ts e2e/detail-revisit.spec.ts e2e/home.spec.ts e2e/responsive.spec.ts e2e/spa-wiring-revisit.spec.ts e2e/wishlist.spec.ts` |
| Unit | `npm test` |
| Build | `npm run build` + `astro preview` |

Every regression spec asserts that the navigation stayed client-side (`__spaTag`),
otherwise a full document load resets Astro's dedupe set and the assertion
passes vacuously. The spec settles each navigation on a pre-registered
`astro:page-load` (`router.js` runs `runScripts()` then `onPageLoad()`): the old
click-based version dropped clicks mid-transition and timed the test out.

## Not in scope / follow-ups

- The four admin components listed above (same shape, separate surface).
- A Back-repo seed with a `carousel` promotion section so `CarouselPromo` can
  have its own committed e2e regression.
- Deleting the inactive `CategoryFilter.astro` / `VariantSelector.astro` and the
  contract tests that pin them: separate decision, no user-visible value.
- Any `data-astro-rerun` route: re-inserting a module script with an unchanged
  URL does not re-evaluate it (the module map is keyed by URL), so the
  attribute cannot revive these bundles.
