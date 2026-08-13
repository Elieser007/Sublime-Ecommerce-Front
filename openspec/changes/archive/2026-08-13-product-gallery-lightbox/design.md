# Design: Product Gallery & Lightbox — Behavior Lock via TDD

## Technical Approach

Extract every pure zoom/pan/navigation computation from `ProductGallery.astro`'s `<script>` (lines 194–227, 304, 330–335) into `src/lib/gallery-lightbox.ts` (repo convention: pure functions in `lib/`, no mutation, vitest node env). The `.astro` script becomes thin DOM wiring: state is a plain `ZoomState` object, events call lib functions, `updateMain` remains the single sync path. TDD RED→GREEN against REQ-10..17; three source-marker tests are deleted; `gallery-utils.ts` tests untouched. Baseline-first: uncommitted working tree is committed as-is before any refactor.

## Architecture Decisions

| Decision | Options | Choice |
|---|---|---|
| Extraction target | (a) jsdom controller tests — no repo precedent, new dep; (b) e2e-only — slow TDD, indirect math asserts; (c) **pure lib module** (exploration rec. 1) | **(c)** — zero deps, locks the exact layer where the 3 bugs lived (math), matches `lib/` convention |
| State model | (a) class with methods; (b) **plain `ZoomState` object + free functions** | **(b)** — no-mutation convention; trivially serializable; functions compose (e.g. `clampPan({...zoom, scale: pinchScale(...)})`) |
| Locked conventions as exported constants | inline literals vs **`MIN_SCALE=1, MAX_SCALE=6, ZOOM_STEP=1.25, DBLCLICK_ZOOM=2.5, WHEEL_FACTOR=1.15`** | **Constants** — single source of truth, tests pin them so future "fixes" can't flip conventions |
| `wheelZoomFactor(ctrlKey, deltaY)` at `deltaY===0` | (a) current behavior → `1/1.15` (zooms out on zero delta — latent bug); (b) **return 1 (no-op)** | **(b)** — zero-delta is boundary noise; documented refinement of the locked convention |
| Baseline commit type | proposal says `fix:` for both; but `ProductGallery.astro` diff **adds the never-shipped lightbox feature** (456 lines) | `fix(product-detail)` for `[slug].astro` layout; **`feat(product-gallery)`** for the lightbox feature (a `fix:` commit containing a 456-line feature would misrepresent history) |
| Extra helpers beyond mandate | `toggleZoomAt`, `pinchScale`, `panTo` | Add — drag/pinch/dblclick behavior (REQ-13/14) must be testable; without them wiring keeps math inline |

## Module API — `src/lib/gallery-lightbox.ts`

```ts
export interface ZoomState { scale: number; tx: number; ty: number }
export const MIN_SCALE = 1;            // clamp floor
export const MAX_SCALE = 6;            // clamp ceiling
export const ZOOM_STEP = 1.25;         // +/− buttons and keyboard
export const DBLCLICK_ZOOM = 2.5;      // dblclick target
export const WHEEL_FACTOR = 1.15;      // wheel/pinch step

export function resetZoom(): ZoomState;                          // { scale: 1, tx: 0, ty: 0 } — fresh object
export function clampScale(scale: number): number;               // min(6, max(1, s))
export function clampPan(s: ZoomState, w: number, h: number): ZoomState;   // ±(dim·(scale−1))/2, max(0,·) at scale 1
export function zoomAt(s: ZoomState, cx: number, cy: number, factor: number, w: number, h: number): ZoomState;
  // next = clampScale(s.scale·factor); k = next/s.scale; tx = cx − (cx−tx)·k; then clampPan — cursor point stays fixed
export function zoomBy(s: ZoomState, factor: number, w: number, h: number): ZoomState;   // zoomAt at (w/2, h/2)
export function toggleZoomAt(s: ZoomState, cx: number, cy: number, w: number, h: number): ZoomState;
  // s.scale > 1 → resetZoom(); else zoomAt(…, DBLCLICK_ZOOM, …)
export function pinchScale(startScale: number, startDist: number, dist: number): number;
  // clampScale(startScale·(dist/startDist)); startDist ≤ 0 → clampScale(startScale)
export function panTo(s: ZoomState, tx: number, ty: number, w: number, h: number): ZoomState;  // clampPan({…s, tx, ty})
export function wheelZoomFactor(ctrlKey: boolean, deltaY: number): number;
  // (ctrlKey && deltaY<0) || (!ctrlKey && deltaY>0) → WHEEL_FACTOR; deltaY===0 → 1; else 1/WHEEL_FACTOR
export function nextIndex(current: number, total: number): number;  // (current+1)%total; total≤0 → current
export function prevIndex(current: number, total: number): number;  // (current−1+total)%total; total≤0 → current
export function formatCounter(index: number, total: number): string; // `${index+1} / ${total}`
export function applyTransform(s: ZoomState): string;                // `translate(${tx}px, ${ty}px) scale(${scale})`
export function shouldShowThumbStrip(count: number): boolean;        // count > 1 — used in SSR template
```

`factor` must be > 0; callers (wheel, buttons) always pass positive values.

## Component Wiring — `ProductGallery.astro`

State: `let zoom = resetZoom()`. Every event → lib call → `applyZoom()` writes `img.style.transform = applyTransform(zoom)`. Stage dims read per event: `const w = stage.clientWidth, h = stage.clientHeight`.

```
DOM event                    lib call
─────────────────────────────────────────────────────────────
wheel (passive:false)        zoom = zoomAt(zoom, cx, cy, wheelZoomFactor(e.ctrlKey, e.deltaY), w, h)
dblclick                     zoom = toggleZoomAt(zoom, cx, cy, w, h)
pointermove (2 ptrs, pinch)  zoom = clampPan({ ...zoom, scale: pinchScale(start.scale, start.dist, dist) }, w, h)
pointermove (1 ptr, drag)    zoom = panTo(zoom, e.clientX − dragOffset.x, e.clientY − dragOffset.y, w, h)
zoom-in / + / =              zoom = zoomBy(zoom, ZOOM_STEP, w, h)
zoom-out / −                 zoom = zoomBy(zoom, 1 / ZOOM_STEP, w, h)
zoom-reset / 0               zoom = resetZoom()
```

- `updateMain(index)` — **single sync path unchanged** (main img src/alt, thumb active + `aria-selected`, `counter.textContent = formatCounter(...)`, `currentIndex`); uses `nextIndex`/`prevIndex` in `showNext`/`showPrev`; if lightbox open → `renderLightbox()` (REQ-16 sync).
- `renderLightbox()` — sets lightbox img/counter (`formatCounter`), lightbox-thumb active, then `zoom = resetZoom()` (REQ-16 zoom-reset on change/open).
- open/close/focus/body-scroll (REQ-17) — wiring only, unchanged.
- **ClientRouter pattern preserved verbatim** (lines 384–388): `window.__galleryLightboxKeyHandler` removal + re-add stays in component script.
- SSR template conditions `images.length > 1` (nav block, thumbs, lightbox) → `shouldShowThumbStrip(images.length)` (REQ-10).

## File Changes

| File | Action | Description |
|---|---|---|
| `src/lib/gallery-lightbox.ts` | Create | Pure zoom/pan/nav/counter/transform math + constants |
| `src/__tests__/gallery-lightbox.test.ts` | Create | Unit tests, RED→GREEN (REQ-10..16) |
| `src/components/ProductGallery.astro` | Modify | Script → thin wiring over lib; template uses `shouldShowThumbStrip`; markers stay |
| `src/__tests__/product-gallery.test.ts` | Modify | Delete `describe("ProductGallery markup (D5)")` (3 marker tests); gallery-utils tests untouched |
| `src/pages/products/[slug].astro` | Modify (baseline only) | Committed as-is (WU1); no further change |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit — REQ-10 | `shouldShowThumbStrip`: 0/1→false, 2→true | exact |
| Unit — REQ-13 | `zoomAt`/`zoomBy`/`clampScale`: 4×2→6, 1×0.5→1; wheel: plain `deltaY>0`→in, `<0`→out; ctrl `deltaY<0`→in, `>0`→out; `0`→1; `toggleZoomAt` 2.5 at pointer, resets when scale>1 | `toBeCloseTo` for 1.15 paths, `toBe` for 1.25/2.5 |
| Unit — REQ-14 | `clampPan` bounds `±(w·(scale−1))/2` both axes; zero at scale 1; `panTo` clamps; **cursor-anchor invariant**: `cx·k + tx === cx` after `zoomAt` (toBeCloseTo) | exact/clamped asserts |
| Unit — REQ-15 | `nextIndex`/`prevIndex` wrap (last→0, 0→last); keyboard mapping asserted via the lib functions it calls | exact |
| Unit — REQ-16 | `resetZoom()` returns fresh initial object; zoom reset on change/open is `renderLightbox`→`resetZoom` (wiring; assert fresh-object semantics) | exact |
| Unit — format | `formatCounter(0,4)`="1 / 4", `(3,4)`="4 / 4"; `applyTransform({scale:2,tx:-100,ty:50})`="translate(-100px, 50px) scale(2)" | exact string |
| E2E | REQ-11/12/17 (open/close/focus/scroll-lock/stage fill) — DOM wiring | **Deferred** (needs ≥2-image seed; Back change) |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary in this change.

## Migration / Rollout

No data migration. Rollout = revert order: WU4 → WU3 restores baseline lightbox; WU2 alone is revertible.

## Work Units (dependency order)

| WU | Commit | Contents |
|---|---|---|
| WU1 | `fix(product-detail): visible thumbnail strip via detail-media column` | `[slug].astro` as-is (detail-media + `min-width:0` + description move) |
| WU2 | `feat(product-gallery): fullscreen lightbox with zoom, pan, pinch and keyboard` | `ProductGallery.astro` as-is (stage-fill CSS, wheel conventions included) |
| WU3 | `feat(product-gallery): add pure lightbox math module` | `gallery-lightbox.ts` + `gallery-lightbox.test.ts` (RED→GREEN, nothing wired) |
| WU4 | `refactor(product-gallery): rewire gallery script over pure math module` | Script → wiring; delete 3 marker tests |

WU2 ≈ 456 + WU3 ≈ 500 + WU4 ≈ 300 changed lines → single-PR budget risk **High**; recommend chained PRs (baseline PR = WU1+WU2; refactor PR = WU3+WU4). Formal forecast in sdd-tasks.

## Risks

| Risk | Mitigation |
|---|---|
| DOM coupling drift (stage dims wrong in wiring) | lib tests use explicit dims; manual smoke; e2e deferred |
| ClientRouter re-execution breaks | Pattern preserved verbatim in component; never moved to lib |
| Convention flip (wheel/dblclick/clamp) | Constants + tests pin REQ-13/14 values |
| Marker deletion overreach | Only the 3 marker tests deleted; `data-counter`/`--x`/`--y`/`gallery-main__img--zoomed`/`keydown` markers stay in `.astro` (SSR/DOM contract); `token-compliance.test.ts` only path-checks the file — unaffected |
| Float inexactness (1.15) | `toBeCloseTo` on scale math; exact strings only for clean factors |

## Open Questions

None blocking.
