# Apply Progress — product-gallery-lightbox

Chained delivery (auto-chain, stacked-to-main), 3 slices. Slice 1 = baseline commits (WU1+WU2). Slice 2 = pure math module via TDD RED→GREEN (WU3). Slice 3 = rewiring + marker-test deletion (WU4) + verification. This artifact is the MERGED cumulative state — all tasks complete.

## Completed — Slice 1 (baseline, PR #10)

| Task | Status | Commit | Evidence |
|------|--------|--------|----------|
| 1.1 Commit `src/pages/products/[slug].astro` as-is | ✅ | `8f5488f` `fix(product-detail): visible thumbnail strip via detail-media column` | Diff verified = description-move + `detail-media`/`min-width:0` + fallback-only `detail-image-container`; nothing else |
| 1.2 Commit `src/components/ProductGallery.astro` as-is | ✅ | `c538c0e` `feat(product-gallery): fullscreen lightbox with zoom, pan, pinch and keyboard` | Diff verified = lightbox feature only (448+/8−); full suite green post-commit |

## Completed — Slice 2 (WU3, PR #11)

| Task | Status | Commit | Evidence |
|------|--------|--------|----------|
| 2.1 RED — constants + `clampScale` + `resetZoom` tests | ✅ | (in WU3 commit) | Written first in `src/__tests__/gallery-lightbox.test.ts`; RED = `Cannot find module '../lib/gallery-lightbox'` (suite 0 test / 1 failed) |
| 2.2 RED — zoom tests (`zoomAt` anchor, `wheelZoomFactor`, `toggleZoomAt`, `pinchScale`) | ✅ | (in WU3 commit) | Same RED run (module missing) → GREEN 47/47 |
| 2.3 RED — pan tests (`clampPan`/`panTo` bounds, zero at scale 1) | ✅ | (in WU3 commit) | RED caught `-0` artifact at scale 1 → canonicalized in `clampPan` (GREEN fix, see Issues) |
| 2.4 RED — nav/format tests (`nextIndex`/`prevIndex` wrap, `formatCounter`, `applyTransform`, `shouldShowThumbStrip`) | ✅ | (in WU3 commit) | Same RED run → GREEN 47/47 |
| 2.5 GREEN — `src/lib/gallery-lightbox.ts` | ✅ | WU3 commit (below) | 47/47 focused green; full suite 1317/1317; `pnpm build` ✓ 104 pages |

WU3 commit: `feat(product-gallery): add pure lightbox math module` — `src/lib/gallery-lightbox.ts` (+135) + `src/__tests__/gallery-lightbox.test.ts` (+286). Nothing wired; `ProductGallery.astro`, `[slug].astro`, `product-gallery.test.ts` untouched (per design, markers stay until slice 3).

## Completed — Slice 3 (WU4, PR #12)

| Task | Status | Commit | Evidence |
|------|--------|--------|----------|
| 3.1 Rewire `ProductGallery.astro` script over lib | ✅ | `7940890` `refactor(product-gallery): rewire lightbox script over pure lib module` | Script now thin DOM wiring: `let zoom: ZoomState = resetZoom()`; every handler → lib call → `applyZoom()` (`applyTransform`); stage dims read per event; `updateMain` single sync path with `nextIndex`/`prevIndex`/`formatCounter`; `renderLightbox` ends `zoom = resetZoom(); applyZoom()` (REQ-16); SSR gates → `shouldShowThumbStrip`; `__galleryLightboxKeyHandler` ClientRouter pattern verbatim; zero inline math left (grep: no `lbScale`/`lbTx`/`lbTy`/`1.15`/`2.5`/`Math.min(6`); markers all stay. Focused tests 60/60 (markers still green = DOM contract intact) |
| 3.2 Delete 3 marker tests | ✅ | `a9ef7f5` `test(product-gallery): drop source-marker tests, behavior now locked by lib tests` | `describe("ProductGallery markup (D5)")` removed + unused `fs`/`path` imports + `gallerySource`; gallery-utils tests untouched; focused tests 57/57 |
| 4.1 Full suite | ✅ | — | `pnpm test` → 65 files / 1314 passed (1317 − 3 deleted markers) |
| 4.2 Build | ✅ | — | `pnpm run build` → complete, 104 pages in 2.43s |
| 4.3 Manual smoke | ✅ (deferred path documented) | — | `pnpm dev` :4321 `/products/camiseta-gimnasio`: page renders, zero console errors/warnings, main image present, REQ-10 gate correct (1 image → no thumbs/lightbox/counter), browser fetched `/src/lib/gallery-lightbox.ts` (200) + rewired script chunk (200), served script imports lib (`importsLib: true`), no inline clamp (`hasInlineClamp: false`), `__galleryLightboxKeyHandler` correctly unset (1-image early return). Interactive multi-image path (wheel/pan/pinch/keys) NOT exercisable — 0/25 seeded products with ≥2 images (pre-known Back seed deferral) |

## Work Unit Evidence

| Evidence | WU1 (`[slug].astro`) | WU2 (`ProductGallery.astro`) | WU3 (pure math module) | WU4 (rewiring + cleanup) |
|----------|----------------------|------------------------------|------------------------|--------------------------|
| Focused test command and exact result | `pnpm test` pre-commit safety net: 64 files / 1270 tests passed | `pnpm test` post-commit: 64 files / 1270 tests passed | RED: `pnpm exec vitest run src/__tests__/gallery-lightbox.test.ts` → 1 failed (module not found). GREEN: same command → 1 passed / 47 tests. Full suite: 65 files / 1317 passed | Safety net (pre-rewire): `pnpm exec vitest run src/__tests__/product-gallery.test.ts src/__tests__/gallery-lightbox.test.ts` → 60/60. Post-rewire: 60/60 (marker tests still green). Post-deletion: 57/57. Full suite: 65 files / 1314 passed. Build: ✓ 104 pages |
| Runtime harness command/scenario and exact result | `pnpm dev` live smoke (:4321, `/products/camiseta-gimnasio`): `detail-media` wrapper present, description after gallery (gallery idx 20 < description idx 579) | SSR smoke: lightbox CSS emitted; lightbox/nav/thumbs correctly omitted for 1-image product (REQ-10 gate) | **N/A — node-env unit tests are the harness** (pure module, no DOM/runtime boundary; wiring deferred to slice 3) | `pnpm dev` :4321 browser smoke (Chrome DevTools): page renders, 0 console errors, REQ-10 gate (no thumbs/lightbox for 1-image product), lib module fetched 200 (`importsLib: true`), no inline clamp. Interactive path N/A beyond this — no multi-image seed (documented deferral) |
| Rollback boundary | Revert `8f5488f` alone — independent of WU2 | Revert `c538c0e` — restores pre-slice gallery | Revert WU3 commit alone — removes module + tests, zero behavior change (nothing wired) | Revert `a9ef7f5` + `7940890` alone — restores the #11 state (module + original script); no other file affected |

## TDD Cycle Evidence

Slice 1 rows: baseline commits of already-written code (orchestrator scope — RED cycle applies from slice 2 onward).

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | — (pure commit) | N/A | ✅ 1270/1270 | N/A — baseline slice | ✅ 1270/1270 post-commit | N/A — no new behavior | N/A — zero content edits |
| 1.2 | — (pure commit) | N/A | ✅ 1270/1270 | N/A — baseline slice | ✅ 1270/1270 post-commit | N/A — no new behavior | N/A — zero content edits |
| 2.1 | `src/__tests__/gallery-lightbox.test.ts` | Unit | ✅ 1270/1270 pre-slice | ✅ Written first (constants pin, clampScale 4×2→6 / 1×0.5→1 / boundaries, resetZoom fresh object); RED: module-not-found | ✅ 47/47 (focused) | ✅ 14 cases (values, both clamp directions, boundary, fresh-object identity) | ➖ None needed |
| 2.2 | same file | Unit | ✅ 1270/1270 | ✅ Written first (anchor invariant, non-zero-tx anchor, max-clamp, wheel 5 conventions, toggle, pinch clamp + invalid dist) | ✅ 47/47 (focused) | ✅ 13 cases | ➖ None needed |
| 2.3 | same file | Unit | ✅ 1270/1270 | ✅ Written first (both-axis clamp, in-bounds passthrough, zero at scale 1, asymmetric stage, panTo) | ✅ 47/47 after `clampPan` `-0` canonicalization | ✅ 7 cases | ✅ `clampPan` — canonicalized negative zero (`tx === 0 ? 0 : tx`), tests green after |
| 2.4 | same file | Unit | ✅ 1270/1270 | ✅ Written first (wrap both directions, invalid total, counter format, exact transform strings, strip gate) | ✅ 47/47 (focused) | ✅ 13 cases | ➖ None needed |
| 2.5 | same file | Unit | N/A (new module) | N/A (RED was 2.1–2.4) | ✅ 47/47 focused; 1317/1317 full suite; `pnpm build` ✓ | N/A (triangulated via 2.1–2.4) | ✅ constants + no-mutation + fresh objects per design |
| 3.1 | (no new tests — wiring refactor) | Wiring (node env) | ✅ 60/60 focused pre-rewire | **N/A — no new behavior to fail first**: all math already locked by the 47 lib tests from slice 2 (approval/parity suite); DOM contract locked by the 3 marker tests (still green post-rewire). Writing new source-marker tests would contradict the design (3.2 deletes exactly that class). Behavior parity verified instead: per-event lib calls identical to old inline math (design wiring table), constants substituted verbatim | ✅ 60/60 focused post-rewire (markers green) | ➖ N/A — parity via 47 lib test cases + preserved markers (see RED) | ✅ Script is now the thin wiring the design specifies; `-0` canonicalization from lib replaces old clamp (behavior-identical rendering) |
| 3.2 | (test deletion) | Unit | ✅ 60/60 pre-deletion | ✅ The 3 deleted tests were the RED-era markers (slice 1, pre-SDD); deletion itself is verified by the surviving behavioral suite | ✅ 57/57 focused post-deletion; 1314/1314 full suite | ➖ N/A — deletion has no branching | ✅ Removed unused `readFileSync`/`resolve` imports + `gallerySource` const |
| 4.1 | — (verification) | Unit | — | N/A — verification only | ✅ 65 files / 1314 passed | N/A | N/A |
| 4.2 | — (verification) | Build | — | N/A — verification only | ✅ 104 pages built | N/A | N/A |
| 4.3 | — (verification) | Runtime smoke | — | N/A — verification only | ✅ Page renders, 0 console errors, lib bundled, REQ-10 gate correct | N/A | N/A |

Test summary: 47 tests written in slice 2 (all RED-first), 47 passing; 3 marker tests deleted in slice 3 (replaced by the lib behavioral suite as the real contract); layers used: Unit (47), wiring verification via runtime smoke (slice 3); approval tests: the 47 lib tests + 13 gallery-utils tests act as the parity/approval suite for the WU4 refactor; pure functions created: 14 (module API, slice 2).

## Delivery / PR Boundary

- Mode: chained PR slice (stacked-to-main), 3 of 3 — final slice; all tasks complete
- PR #10 (slice 1): https://github.com/Elieser007/Sublime-Ecommerce-Front/pull/10 — base `main`, head `feat/product-gallery-lightbox-01-baseline`, 467+/15− (482 changed lines, 2 files)
- PR #11 (slice 2): https://github.com/Elieser007/Sublime-Ecommerce-Front/pull/11 — head `feat/product-gallery-lightbox-02-module`, base `feat/product-gallery-lightbox-01-baseline` (stacked-to-main; retarget to `main` after #10 merges). Diff = WU3 only: `gallery-lightbox.ts` (+135) + `gallery-lightbox.test.ts` (+286) = 421 changed lines. Review budget note: 421 > 400 guideline — test file carries the TDD evidence (47 behavioral cases); planned split per `tasks.md` with `Decision needed before apply: No`.
- **PR #12 (slice 3, final)**: https://github.com/Elieser007/Sublime-Ecommerce-Front/pull/12 — head `feat/product-gallery-lightbox-03-rewiring`, base `feat/product-gallery-lightbox-02-module` (stacked-to-main; retarget to `main` after #11 merges). Diff = WU4 only: `ProductGallery.astro` (+73/−72) + `product-gallery.test.ts` (−24) = 169 changed lines (well under the 400 guideline).
- Boundary: starts at `93c4017` (head of `feat/product-gallery-lightbox-02-module`); ends with `a9ef7f5` — two work-unit commits (`7940890` rewire, `a9ef7f5` marker-test deletion), independently revertible.
- Chain: stacked-to-main — `main` ← #10 (baseline) ← #11 (module) ← 📍 #12 (rewiring, final).

## Deviations from Design

- Test file path: `src/__tests__/gallery-lightbox.test.ts` (design + tasks spec), not `src/lib/gallery-lightbox.test.ts` (orchestrator's illustrative "e.g.") — matches design's File Changes table and repo test convention.
- `clampPan` canonicalizes negative zero so fit state is exactly `{scale:1, tx:0, ty:0}` (design: "zero at scale 1"); avoids `translate(-0px, …)` output. Formula otherwise identical to design/current script. Now live in the component via the rewire (old inline clamp produced the same CSS output; lib output is canonical).
- **Zero-delta wheel refinement now live**: old script zoomed OUT on `deltaY === 0` (`1/1.15`) — a latent bug; `wheelZoomFactor` returns 1 (no-op) per the design's decision table. Wired and active in slice 3.
- Zoom toolbar button listeners moved inside the existing `if (stage)` guard (they were attached outside it before); behavior identical (buttons only exist when the lightbox/stage exists), and TS-strict no longer needs `stage` null-coalescing there. Keyboard zoom branches read `stage?.clientWidth ?? 0` (stage guaranteed non-null when the lightbox is open, the only time keys act).
- Commit split within WU4: `refactor(...)` + `test(...)` as two work-unit commits (orchestrator's suggested split) instead of the single WU4 commit listed in the design's Work Units table — same deliverable, more reviewable.
- No new tests written in slice 3 (see TDD table 3.1 RED column): the slice is pure wiring; the 47 lib tests + 13 gallery-utils tests + preserved markers are the parity contract. This mirrors how slice 2 locked behavior before wiring.

## Issues Found

- `Math.min(maxX, Math.max(-maxX, s.tx))` yields `-0` when clamping at scale 1 → `toEqual` failed. Fixed in `clampPan` (canonicalization); now wired into the component (old script had the same latent artifact, harmless in CSS but non-canonical state).
- First `clampPan` test case used in-bounds data (`tx: 999` vs bound 1000) — corrected to `tx: 2000`; assertion unchanged in meaning.
- Pre-commit hook logs "No matching files staged" for `.astro`/non-`.ts`-only commits (hook pattern only matches `.ts/.js`) — benign noise, consistent across all three slices; hook cache also logged a stale run for the `.ts` deletion commit.
- Multi-image lightbox runtime path still not exercisable (0/25 seeded products with ≥2 images) — pre-known deferral (Back seed change); affects e2e and the interactive portion of manual smoke only. SSR gate, bundling, and zero-error page render verified as the documented minimum.
- `openspec/changes/product-gallery-lightbox/` remains untracked in git (consistent with slices 1–2 — artifacts live in the working tree + Engram, not in feature commits).

## Remaining Tasks (future slices)

None — all tasks (1.1–4.3) complete. Next phase: verify (sdd-verify).
