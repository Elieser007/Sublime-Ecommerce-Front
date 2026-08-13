# Proposal: Product Gallery & Lightbox — Behavior Lock via TDD

## Intent

Gallery/lightbox on `/products/[slug]` was built ad-hoc; three bugs (invisible thumb strip, small lightbox image, inverted zoom) shipped while tests only asserted source-text markers. Goal: extract all zoom/pan/navigation math into a pure lib module, lock behavior with real unit tests (strict TDD), keep DOM wiring thin and behavior-identical.

## Scope

### In Scope
- Extract pure math from `ProductGallery.astro` `<script>` into new `src/lib/gallery-lightbox.ts`: next/prev wraparound, `zoomAt` (anchor + 1–6× clamp), `clampPan` (`±(stage·(scale−1))/2`), zoom step factors, wheel mapping (plain `deltaY>0` → in; ctrl-pinch `deltaY<0` → in), pinch scale, dblclick toggle (2.5×/reset), counter `"N / M"`, transform string.
- Replace 3 source-marker tests with behavior tests; keep `gallery-utils` tests. New `src/__tests__/gallery-lightbox.test.ts` (RED→GREEN, node env, zero new deps).
- Commit uncommitted fixes (thumb-strip visibility, lightbox natural size, wheel conventions) as baseline `fix:` commits FIRST, refactor on top.
- Delta spec: lightbox requirements (sdd-spec phase).

### Out of Scope
- No backend changes — e2e smoke deferred: `seed-catalog.ts` gives every product exactly 1 image (multi-image seed is a Back change).
- No new dependencies; no jsdom/happy-dom DOM unit tests.
- No cart/WhatsApp/description/hover-zoom markup changes beyond committed fixes.

## Capabilities

### New Capabilities
None

### Modified Capabilities
- `product-gallery`: ADDED lightbox requirements (open via expand icon/main-image click; close via ✕/Escape/backdrop; zoom/pan/pinch; wheel conventions; keyboard `+`/`-`/`0`/arrows; counter; thumbs sync). Stale `/producto/{slug}` scenario fixed at archive.

## Approach

Exploration approach 1: extract pure math to `src/lib/gallery-lightbox.ts`; component script becomes thin DOM wiring (updateMain sync, open/close focus, ClientRouter `__galleryLightboxKeyHandler` pattern preserved); vitest node env. Baseline-first commit gives a revertable "works today" point.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/gallery-lightbox.ts` | New | Pure lightbox math |
| `src/__tests__/gallery-lightbox.test.ts` | New | Unit tests (RED→GREEN) |
| `src/components/ProductGallery.astro` | Modified | Script → DOM wiring over lib |
| `src/__tests__/product-gallery.test.ts` | Modified | Marker tests → behavior tests |
| `src/pages/products/[slug].astro` | Modified (baseline) | Fix committed as-is; no further change |
| `openspec/specs/product-gallery/spec.md` (container) | Modified (archive) | Lightbox merge + `/producto` fix |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Extraction changes behavior | Med | Math conventions locked by unit tests; manual smoke |
| Marker tests deleted | Low | DOM-contract markers (`data-counter`, `gallery-counter`, `data-thumb-id`, `data-action`, `--x/--y`) stay in markup — SSR contract untouched |
| ClientRouter key-handler break | Low | Wiring stays in component |
| e2e needs multi-image seed | High (if pursued) | Deferred — Back change, non-blocker |

## Rollback Plan

`git revert` of the refactor commit restores the baseline fixes; baseline `fix:` commits independently revertible. No data migration.

## Dependencies

None new. (e2e smoke: Back seed multi-image product — deferred.)

## Success Criteria

- [ ] `pnpm test` green; clamps, wrap, wheel mapping, pinch, counter, transform covered
- [ ] Marker tests replaced (no source-string behavior assertions)
- [ ] Manual smoke: strip visible, lightbox fills screen, zoom works in both conventions, pan clamped, ✕/Esc/arrows/+/−/0 work

## Proposal question round (auto mode — assumptions needing review)

1. Commit uncommitted fixes as baseline first? (recommended: yes)
2. Lock current wheel/dblclick conventions as-is? (recommended: yes)
3. Defer e2e smoke until a Back seed change exists? (recommended: yes)
