# Exploration: product-gallery-lightbox

Change: bring the product-detail gallery + fullscreen lightbox under real TDD. The gallery
(thumbnail navigation, hover zoom, counter, keyboard) and the lightbox (zoom/pan/pinch,
prev/next, keyboard, own thumbs) exist and work, but behavior was built ad-hoc with zero
behavior tests — the only tests assert text markers in the `.astro` source.

## Current State

### Component (`src/components/ProductGallery.astro`, 687 lines)

- **Markup** (lines 31–108): `.product-gallery[data-gallery]` wraps `.gallery-main` (main
  `<img data-main-image>`, prev/next `[data-action]` buttons, `[data-counter]`, fullscreen
  toggle), `.gallery-thumbs` (`[data-thumb-id]` buttons), and `.gallery-lightbox[data-lightbox]`
  (close/prev/next, `[data-lightbox-stage]` + `[data-lightbox-img]`, toolbar with
  `[data-lightbox-counter]` + zoom buttons, `[data-lightbox-thumb-idx]` strip). All lightbox
  markup is template-rendered (no dynamic `createElement`), so scoped CSS applies.
- **Script** (lines 110–390): a module script that runs per `[data-gallery]` root. State:
  `currentIndex`, `lbScale`, `lbTx`, `lbTy`, `activePointers` (Map), `pinchStart`, `dragOffset`.
  Pure-ish math mixed with DOM: `updateMain`, `renderLightbox`, `openLightbox`, `closeLightbox`,
  `applyZoom`, `clampPan`, `resetZoom`, `zoomAt`, `zoomBy`, `showPrev/showNext`, plus wheel /
  dblclick / pointer / keyboard handlers. ClientRouter pattern: `window.__galleryLightboxKeyHandler`
  replaced on re-execution (lines 384–388).
- **Styles** (lines 392–686): `.gallery-main` has `aspect-ratio: 1; max-height:
  max(320px, calc(100dvh - 260px)); overflow: hidden` (height cap so main + strip fit the
  viewport); `.lightbox-stage__img` `width/height: 100%; object-fit: contain` (fixes natural-size
  rendering); `@media (hover: none)` disables hover zoom on touch.

### Page (`src/pages/products/[slug].astro`)

- Line 92–104: `.detail-media` column → `<ProductGallery>` when `images.length > 0`, else
  `.detail-image-container` fallback. Description sits BELOW the gallery (line 101).
- Line 490–497: `.detail-media { min-width: 0 }` (grid shrink fix that made the thumb strip
  visible — the strip was previously clipped because `.detail-image-container`
  (`aspect-ratio:1 + overflow:hidden`) wrapped the whole gallery).
- Line 496 comment documents the fix. `[slug].astro` also carries the volume-tier/variant/
  WhatsApp logic (unrelated to this change).

### Existing tests (the gap)

- `src/__tests__/product-gallery.test.ts` (112 lines): navigation helpers via
  `lib/gallery-utils.ts` (getPrimaryImage/getNextImage/getPrevImage/getImageCount/getImageById) +
  THREE text-marker tests (lines 97–112) that `readFileSync` the `.astro` source and assert
  `--x`, `--y`, `gallery-main__img--zoomed`, `data-counter`, `gallery-counter`, `keydown`.
  **Weakness**: these pass even when behavior breaks — the invisible-strip bug, the natural-size
  lightbox bug, and the wheel-direction flip all shipped with the marker tests green. They also
  break on refactor if markers move to `lib/`.
- `src/lib/gallery-utils.ts`: pure navigation helpers used by `admin/products.astro` + tests,
  NOT imported by `ProductGallery.astro` (the component navigates by index, not by id).

### Test environment

- `vitest.config.ts`: `include: ['src/**/*.test.ts']`, `globals: true` — **no `environment`
  set** → node. **jsdom/happy-dom NOT installed** (checked node_modules + lockfile; only
  optional-peer references exist). Zero DOM unit tests exist in the repo; all tests are pure
  logic or marker tests.
- `package.json`: `test` = `vitest run`. Playwright 1.62.1 installed with a full webServer
  setup (`playwright.config.ts`: backend `wrangler dev` on :8787 with seeded D1 +
  `RATE_LIMIT_DISABLED/ENVIRONMENT=test`, then Astro dev daemon on :4321 with a readiness gate
  on `/api/public/products?limit=1`). e2e pattern: `detail-volume.spec.ts` → `page.goto("/products/camiseta-gimnasio")` against the seeded backend.

### OpenSpec layout (split-brain — important for later phases)

- **Container** `/home/elieser/Dev/Sublime-Ecommerce/openspec/`: `config.yaml` (project
  `sublime-ecommerce`, `strict_tdd: true`, `artifact_store: openspec`, `delivery: single-pr`)
  + `specs/product-gallery/spec.md` (the MAIN gallery spec: primary image, thumb strip, arrows,
  REQ-7 hover zoom, REQ-8 counter, REQ-9 keyboard — **zero lightbox requirements**) + older
  archived changes.
- **Front repo** `Sublime-Ecommerce-Front/openspec/`: NO config.yaml, NO specs/ — only
  `changes/` with the recent change folders (`english-routes-and-wishlist`, `promo-visual-editor`,
  `fase-*`) in the standard layout (exploration.md / proposal.md / specs/{domain}/spec.md /
  design.md / tasks.md / verify-report.md / apply-progress.md / archive-report.md). The new
  change folder lives here: `openspec/changes/product-gallery-lightbox/`.
- Main spec is STALE: first scenario still reads `/producto/{slug}` (pre-english-routes rename);
  the entire lightbox feature is unspecified (zoom clamp 1–6×, pan clamp
  `±(stage·(scale−1))/2`, plain-wheel deltaY>0 = zoom-in, ctrl-pinch deltaY<0 = zoom-in,
  dblclick 2.5× / reset, keyboard +/−/0/Esc/arrows, focus management, thumbs sync).

### Pure vs. imperative logic inventory (for extraction)

| Logic | Location | Pure? | Extractable to `src/lib/` |
|---|---|---|---|
| next/prev wrap `(i ± 1 + n) % n` | updateMain callers | yes | `gallery-lightbox.ts` (or reuse gallery-utils by index) |
| `zoomAt` anchor math + 1–6 clamp | lines 210–218 | yes | `gallery-lightbox.ts` |
| `clampPan` `max(0, (stage·(scale−1))/2)` | lines 194–201 | yes | `gallery-lightbox.ts` |
| wheel direction mapping (`ctrlKey ? deltaY<0 : deltaY>0`) | line 304 | yes | `gallery-lightbox.ts` |
| pinch scale `clamp(start·(dist/startDist))` | lines 330–335 | yes | `gallery-lightbox.ts` |
| dblclick toggle (scale>1 → reset, else ×2.5) | lines 308–312 | yes | `gallery-lightbox.ts` |
| counter format `"N / M"` | lines 148, 166 | yes | `gallery-lightbox.ts` |
| transform string `translate(tx,ty) scale(s)` | line 191 | yes | `gallery-lightbox.ts` |
| updateMain sync (src/alt/classes/aria) | lines 134–151 | no | stays in component |
| open/close + focus + body overflow | lines 174–187 | no | stays in component |
| event wiring (wheel/pointer/keyboard) | lines 253–388 | no | stays in component |

## Affected Areas

- `src/components/ProductGallery.astro` — extraction target; script shrinks to DOM wiring over pure lib calls; marker tests updated.
- `src/lib/gallery-lightbox.ts` (new) — pure lightbox math (zoom/pan/pinch/wheel/format); TDD unit-test surface.
- `src/lib/gallery-utils.ts` — optionally extend with index-based navigation; currently unused by the component.
- `src/__tests__/product-gallery.test.ts` — replace text-marker tests with real behavior tests of the extracted logic; keep/extend gallery-utils coverage.
- `src/__tests__/gallery-lightbox.test.ts` (new) — RED→GREEN unit tests for all pure math.
- `src/pages/products/[slug].astro` — only if the page layout needs spec-locked assertions; currently fine (min-width: 0 fix in place).
- `openspec/specs/product-gallery/spec.md` (container) — archive phase will merge new lightbox requirements; fix stale `/producto/` reference then.
- `e2e/` (optional) — new `gallery-lightbox.spec.ts` following `detail-volume.spec.ts` pattern; REQUIRES a seeded product with ≥ 2 images (camiseta-gimnasio may have 1 — verify seed; else pick/adjust seed product in Back repo).

## Approaches

1. **Pure-logic extraction + unit tests (node env, zero new deps)** — move zoom/pan/pinch/wheel/counter/transform math into `src/lib/gallery-lightbox.ts`; TDD it with vitest (node); component script consumes it. Optionally add one Playwright e2e smoke spec (lightbox opens, zooms, closes) if a multi-image seeded product exists.
   - Pros: matches repo convention ("Pure functions in `lib/` — extract logic from `.astro` `<script>` blocks"); zero new dependencies; fast RED→GREEN loop; math regressions (wheel direction, clamps, anchors) permanently locked.
   - Cons: DOM wiring (event binding, focus, open/close) not unit-tested — covered only by e2e if added.
   - Effort: Medium.

2. **Add happy-dom/jsdom + component DOM tests** — new devDependency, extract the script into a controller module that binds to a root element, unit-test open/close/keyboard/wheel in a DOM harness.
   - Pros: tests the actual wiring, not just math; strongest unit guarantees.
   - Cons: no repo precedent (zero DOM unit tests today); new dependency + environment config; Astro script extraction is more invasive; brittle DOM harnesses.
   - Effort: High.

3. **Playwright e2e only** — cover all gallery/lightbox behavior in-browser against the seeded backend.
   - Pros: real browser environment, infra already exists; verifies final UX.
   - Cons: slow feedback for TDD; math assertions on `style.transform` are indirect; seed may lack a multi-image product (Back repo change or seed extension required).
   - Effort: Medium.

## Recommendation

**Approach 1 (+ optional e2e smoke spec).** It is the only approach consistent with both the
repo's established convention (lib extraction + node-env vitest, strict TDD RED→GREEN) and the
zero-dependency test environment. The recurring ad-hoc bugs were all in the MATH layer (clip,
natural size, wheel direction) — exactly what pure functions lock down. DOM wiring has been
stable since the ClientRouter fixes and is better covered by one e2e smoke test than by a
jsdom harness with no precedent. Keep the component's script as thin DOM wiring over
`src/lib/gallery-lightbox.ts`; update the marker tests to behavior tests.

## Risks

- **jsdom/happy-dom not installed** — DOM-level unit tests need a new devDependency; approach 1 avoids this entirely.
- **Script tightly coupled to DOM** — extraction must preserve the ClientRouter re-execution pattern (`window.__galleryLightboxKeyHandler` replacement) and `updateMain`'s single-sync path (main img, thumbs, counter, lightbox).
- **e2e requires backend seed with ≥ 2 images** — verify the seed product (`camiseta-gimnasio` in Back repo `seed:e2e`); if single-image, gallery e2e needs a seed tweak (Back repo, coordination needed) or is skipped for this change.
- **Marker tests will break on refactor** — they assert component-source markers; moving markers to `lib/` fails them. They must be rewritten as part of this change (deliberate, not incidental).
- **openspec split-brain** — config.yaml + main spec live at container level; change folders live in the front repo. sdd-spec/sdd-archive must target `openspec/changes/product-gallery-lightbox/` (front) for deltas and the container `specs/product-gallery/spec.md` for the eventual merge; main spec also has a stale `/producto/{slug}` reference to fix during archive.
- **Uncommitted working tree** — `ProductGallery.astro` and `[slug].astro` currently have uncommitted ad-hoc fixes; the change should start from a committed baseline (decide in proposal: commit as-is first vs. fold into the change).
- **Opinionated interaction conventions** (plain wheel deltaY>0 = zoom in; ctrl pinch deltaY<0 = zoom in; dblclick 2.5×) need explicit spec scenarios so future "fixes" don't flip them back.

## Ready for Proposal

Yes — proceed to sdd-propose. Tell the user: the gallery/lightbox math will be extracted into a
pure `src/lib/gallery-lightbox.ts` and TDD'd with vitest (no new dependencies); marker tests
will be replaced by real behavior tests; a Playwright smoke spec is optional pending a
multi-image seeded product; openspec delta lands in the front repo, merging into the container
main spec at archive.
