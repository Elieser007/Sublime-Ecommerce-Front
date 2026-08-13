# Archive Report — product-gallery-lightbox

**Change**: product-gallery-lightbox
**Archived**: 2026-08-13
**Project**: Sublime-Ecommerce-Front (Astro 7 SSG)
**Final verdict**: PASS WITH WARNINGS — archived 2026-08-13
**Artifact store**: hybrid (filesystem archive + Engram topic `sdd/product-gallery-lightbox/archive-report`)

## Status

The SDD cycle is COMPLETE. All 11+ tasks were completed and checked in the persisted tasks artifact (12 checked, 0 unchecked); verification passed with two non-blocking warnings; the delta spec was merged into the container main spec; the change folder was moved to the archive with an empty `diff -r` readback.

## What Shipped

Extraction of all zoom/pan/navigation math from `ProductGallery.astro`'s `<script>` into a pure lib module `src/lib/gallery-lightbox.ts` (constants MIN 1 / MAX 6 / STEP 1.25 / DBL 2.5 / WHEEL 1.15; 14 pure functions, no mutation, fresh objects), with the component script rewired as thin DOM wiring. Three source-marker tests replaced by 47 behavior tests in `src/__tests__/gallery-lightbox.test.ts` (RED→GREEN, node env, zero new deps). Baseline fixes committed first: visible thumbnail strip (`[slug].astro`) and the fullscreen lightbox feature (`ProductGallery.astro`, WU2 baseline).

### Requirements Shipped (delta REQ-10..17, 20 scenarios)

- REQ-10 Scrollable Thumb Strip — strip below main image, horizontal scroll, ≥2-image gate (SSR `shouldShowThumbStrip`)
- REQ-11 Lightbox Open and Close — expand button / main-image click (off controls); ✕ / Escape / backdrop close
- REQ-12 Stage Fill, Counter, Strip Sync — `object-fit: contain` stage, "N / M" counter, synced strip
- REQ-13 Zoom Math — clamp [1,6], wheel/pinch conventions, cursor-anchored wheel zoom, 1.25× steps, 2.5× double-click toggle
- REQ-14 Pan Clamping — ±(stage·(scale−1))/2 clamp, disabled at scale 1 except pinch, `-0` canonicalization
- REQ-15 Navigation and Keyboard — wrap-around arrows + ←/→, keyboard map (+/=, −, 0, Escape) gated on open
- REQ-16 Sync and Reset — single shared `currentIndex`, `updateMain` single sync path, zoom reset on change/open
- REQ-17 Lightbox Accessibility — focus move on open/close, body scroll lock, aria-labels (see W-1 for the one normative gap)

## Verification Summary (final state)

| Metric | Result |
|--------|--------|
| Verdict | PASS WITH WARNINGS (per `verify-report` 2026-08-13; no later re-verify needed — no CRITICAL findings at any point) |
| Tasks | 12/12 checked in archived `tasks.md` (0 unchecked) |
| Unit tests | 1314/1314 passed (65 files), exit 0 — `pnpm test` |
| Build | 104 pages, exit 0 — `pnpm run build` (strict TS clean) |
| TDD | 47 RED-first tests, 7/7 verifiable TDD checks passed |
| Scenario evidence | 20/20 have evidence: 9 unit-tested (COMPLIANT), 11 code-review/SSR (COVERED-BY-CODE-REVIEW, runtime path deferred) |
| Coverage | Not available (no coverage provider installed) — informational |
| CRITICAL findings | 0 (nothing ever blocked archive) |

Test count provenance: 1270 baseline + 47 lib − 3 deleted markers = 1314, verified by the independent verify run (1314/1314) and confirmed in the final-state handoff.

## Delivery

3 chained PRs, stacked-to-main:

| PR | Contents | Commits |
|----|----------|---------|
| #10 | Baseline: WU1 `fix(product-detail)` + WU2 `feat(product-gallery)` | `8f5488f`, `c538c0e` |
| #11 | WU3 pure math module (47 RED-first tests) | `93c4017` |
| #12 | WU4 rewiring + marker-test cleanup | `7940890`, `a9ef7f5` |

All commits confirmed in `git log` at verification time and at archive time.

## Main Spec Merge

Delta merged into container main spec `openspec/specs/product-gallery/spec.md` (container OpenSpec — source of truth for the `product-gallery` capability):

- **Added**: REQ-10..17 (8 requirements, 20 scenarios) appended in the container's `### Requirement:` / `#### Scenario:` format — byte-identical to the delta block (verified by `diff`).
- **Fixed**: stale `/producto/{slug}` legacy-route scenario → `/products/{slug}` in the "Display Primary Image as Main Viewer" requirement, per the route-sweep convention (legacy Spanish routes 301-redirect; new code and spec scenarios target English routes).
- Merged spec: 21 requirements / 47 scenarios. All pre-existing requirements preserved untouched.
- No destructive merge (ADDED-only delta); no confirmation needed.

## Follow-ups (NOT blockers — recorded for owners)

| ID | Item | Owner | Suggested action |
|----|------|-------|------------------|
| W-1 | REQ-17 normative gap: lightbox markup lacks `role="dialog"` + `aria-modal="true"` — pre-existing since WU2 baseline (`c538c0e`), NOT introduced by the rewire; no scenario covers it; focus/scroll-lock/labels are implemented | Front (orchestrator) | One-line template change on the `.gallery-lightbox` div; also consider focus trap + `aria-labelledby` (S-2) |
| W-2 | Interactive multi-image lightbox runtime path (open/zoom/pan/pinch/keyboard/focus/scroll-lock) verified by code review only — Back seed has 0/25 products with ≥2 images | Back + Front (e2e) | Back seed change adding a ≥2-image product + `e2e/detail-lightbox.spec.ts` to close the deferred runtime coverage |
| S-1 | REQ-12 scenario "image fills the stage with no letterbox space" technically conflicts with `object-fit: contain` semantics (letterboxes on aspect mismatch) — CSS is the WU2 baseline contract | Spec owner | Clarify scenario wording in the archived spec (e.g., "fills the stage within the stage bounds, contain-fit") |
| S-3 | Pre-commit hook noise: "No matching files staged" on `.astro`/`.ts`-only commits (hook patterns exclude `.astro`) | Repo tooling | Benign; optionally extend hook patterns — not required |

## Rollback Notes

- `git revert` of `7940890` (WU4 rewire) restores the WU2 baseline lightbox with zero behavior change (lib module remains, unwired).
- Reverting `93c4017` (WU3) removes the module; wiring tests fail until `7940890` is also reverted.
- Baseline commits `8f5488f` (fix) and `c538c0e` (feat) are independently revertible; reverting the feat restores the old gallery.
- No data migration; no backend changes; `gallery-utils.ts` untouched.

## Intentional Deviations / Exceptions

- None. Archive is NOT partial, no stale-checkbox reconciliation was needed, no intentional-with-warnings override required (warnings are documented follow-ups, not blockers).

## Traceability

Artifacts archived: exploration.md, proposal.md, spec.md (delta), design.md, tasks.md, apply-progress.md, verify-report.md, archive-report.md. Engram topic: `sdd/product-gallery-lightbox/archive-report` (project `sublime-ecommerce-front`).
