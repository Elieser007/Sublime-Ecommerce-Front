# Tasks: Product Gallery & Lightbox — Behavior Lock via TDD

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,336 (WU1 ≈80, WU2 ≈456, WU3 ≈500, WU4 ≈300) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (WU1+WU2) → PR 2 (WU3) → PR 3 (WU4) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Focused test | Runtime harness | Rollback boundary |
|------|------|----|--------------|-----------------|-------------------|
| WU1 | Commit `[slug].astro` fix as-is (`fix(product-detail)`) | 1 | `pnpm test` | `pnpm dev` strip-visible smoke | Revert alone; independent |
| WU2 | Commit lightbox as-is (`feat(product-gallery)`, ≈456) | 1 | `pnpm test` | `pnpm dev` lightbox smoke | Revert restores old gallery |
| WU3 | Pure lib + RED→GREEN tests, unwired | 2 | `pnpm exec vitest run src/__tests__/gallery-lightbox.test.ts` | N/A — node-env tests are the harness | Revert removes module; zero behavior change |
| WU4 | Rewire `.astro` over lib; delete 3 marker tests | 3 | `pnpm test && pnpm run build` | `pnpm dev` manual smoke (open/zoom/pan/keys) | Revert rewiring restores WU2 |

Non-goals: no new deps, no jsdom, no backend changes, e2e deferred (needs Back multi-image seed), `gallery-utils.ts` untouched.

## Phase 1: Baseline Commits

- [x] 1.1 Commit `src/pages/products/[slug].astro` as-is: `fix(product-detail): visible thumbnail strip via detail-media column`
- [x] 1.2 Commit `src/components/ProductGallery.astro` as-is: `feat(product-gallery): fullscreen lightbox with zoom, pan, pinch and keyboard`; DoD: `pnpm test` green

## Phase 2: Pure Math Module — TDD RED→GREEN (WU3)

- [x] 2.1 RED — `gallery-lightbox.test.ts`: pin constants (MIN 1, MAX 6, STEP 1.25, DBL 2.5, WHEEL 1.15); `clampScale` 4×2→6, 1×0.5→1; `resetZoom` fresh object (REQ-13/16)
- [x] 2.2 RED — zoom: `zoomAt` cursor-anchor `cx·k+tx===cx`; `wheelZoomFactor` plain `deltaY>0`→in, ctrl `deltaY<0`→in, `0`→1 (REQ-13); `toggleZoomAt` 2.5 at pointer, reset when scale>1; `pinchScale` clamps (REQ-14); `toBeCloseTo` (1.15), `toBe` (1.25/2.5)
- [x] 2.3 RED — pan: `clampPan`/`panTo` bounds `±(w·(scale−1))/2` both axes, zero at scale 1 (REQ-14)
- [x] 2.4 RED — nav/format: `nextIndex`/`prevIndex` wrap (REQ-15); `formatCounter(0,4)`="1 / 4"; `applyTransform` exact string; `shouldShowThumbStrip` 0/1→false, 2→true (REQ-10)
- [x] 2.5 GREEN — `src/lib/gallery-lightbox.ts`: `ZoomState`, 5 constants, 14 functions per design API (no mutation, fresh objects, `factor > 0`); DoD: vitest green

## Phase 3: Component Rewiring (WU4)

- [x] 3.1 Rewire `ProductGallery.astro` `<script>`: `let zoom = resetZoom()`; events → lib calls → `applyZoom()` writes `img.style.transform`; stage dims per event; `updateMain` single sync path (`nextIndex`/`prevIndex`); `renderLightbox()` → `resetZoom()`; `__galleryLightboxKeyHandler` removal/re-add verbatim; SSR → `shouldShowThumbStrip`; markers stay (`data-counter`, `gallery-counter`, `data-thumb-id`, `data-action`, `--x`/`--y`, `keydown`)
- [x] 3.2 Delete `describe("ProductGallery markup (D5)")` (3 marker tests) in `src/__tests__/product-gallery.test.ts`; gallery-utils and other suites untouched

## Phase 4: Verification

- [x] 4.1 `pnpm test` — full suite green (incl. gallery-utils, token-compliance)
- [x] 4.2 `pnpm run build` — strict TS + SSG green
- [x] 4.3 Manual smoke (`pnpm dev`): strip, stage fill, wheel, pan clamp, ✕/Esc/arrows/+/−/0, focus/scroll-lock (REQ-11/12/17; e2e deferred)
