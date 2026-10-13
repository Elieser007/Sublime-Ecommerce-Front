# Feature: admin surface re-arm, advisory fixes and dead-code removal

Status: implemented and verified on `fix/client-router-public-surface`
(continuation of `odd/tasks/client-router-public-surface.md`); the Back repo
carries the matching e2e fixtures. Push/PR/merge are the user's decision.
Owner: orchestrator + user

## Why

The gallery/carousel fix proved the mechanism: `<ClientRouter />` executes each
bundled component `<script>` at most once per document session (Astro dedupes by
`src`), so module-scope DOM wiring is dead on the second client-side visit of a
route. The same defect remained on the admin surface, two native advisory
findings sat on the new init code, and the repository carried component files
that nothing imports.

## Tasks

- [x] Task 1 — admin SPA-revisit e2e (RED) + re-arm `AttributeManager`,
      `AdminProductForm`, `ImageUploader` (GREEN) + guard extension.
- [x] Task 2 — advisory fixes: carousel autoplay leak, gallery body-scroll lock.
- [x] Task 3 — delete the seven dead components and the tests/comments that pin
      them.
- [x] Task 4 — Back seed fixtures (carousel wall, gallery images) + Front
      deterministic regressions.
- [x] Task 5 — full verification (public battery, admin battery, unit suites,
      build, production artifact) and native review.

## What changed

### Front — admin surface (`AttributeManager`, `AdminProductForm`, `ImageUploader`)

Same house pattern as the gallery: everything inside `initX()` registered
through `document.addEventListener('astro:page-load', window.__xInit)` with
remove-then-add dedupe; the window-level `open-attributes` handler goes through a
`window.__adminAttributeManagerOpenHandler` replace-slot. Admin navigation is
client-side (`AdminSidebar` links + `<ClientRouter />` via `AdminLayout`), which
is why the defect was user-visible there too.

### Front — advisory findings on the new init code

The vendor finding text for lineage `review-1541ae1cad48…`/`review-1541ae1cad15e484`
was **not recoverable**: consuming the receipt purged the reviewer artifact (only
`.git/gentle-ai/review-transactions/terminal-consumption/v1/65915f8b….json`
survives, with no findings). Both flagged locations were re-read instead and the
concrete defects there were fixed:

- `src/components/promo/CarouselPromo.astro` — (a) autoplay intervals outlived
  their page after an SPA swap; a module-scope cleanup registry is now drained at
  the start of every page-load; (b) `startAuto()` armed a second interval
  whenever it ran twice (hover-out after a click), orphaning the previous one
  beyond the reach of `stopAuto`/the drain — it is now stop-first, so at most one
  autoplay interval exists per carousel in every path.
- `src/components/ProductGallery.astro` — opening the lightbox locked
  `document.body.style.overflow` and an SPA navigation left the new page
  unscrollable; the lock is now flag-gated (`window.__galleryBodyLock`) and
  released at the start of `initGalleries()` only when the gallery itself left it
  behind, so another modal's lock is never clobbered.

### Front — dead code removed (zero importers, grep-verified)

`src/components/CategoryFilter.astro`, `src/components/product/{VariantSelector,
VariedadSelector,ColorSelector,SizeSelector,MaterialSelector}.astro`,
`src/components/admin/DependencyForm.astro`, plus their pins: the two dead-source
suites and consts in `src/components/__tests__/VariedadSelector.test.ts` (the
live `variant-selector.js` suites, the price math and the locale-hint suite were
kept, the last retargeted to the live source), two `EXEMPT_FILES` entries in
`src/__tests__/token-compliance.test.ts`, the stale `Used by` comment in
`src/lib/variant-logic.ts`, and an unused `PromotionWall` import in
`src/pages/admin/promotions.astro`. The live `variant-selector` custom element
and every stored `frontend_component` string survive untouched.

The wrapped init bodies were also re-indented to the house style
(`PriceTierList.astro`, `login.astro`); verified whitespace-only by comparing
`git diff --stat` with `git diff -w --stat` (e.g. `AttributeManager` 438+/415−
vs 26+/3−).

### Back — deterministic e2e fixtures (`scripts/seed-e2e.ts`)

Two regressions depended on hand-made rows that only existed in the drifted dev
database (and `promo-cat-bot` was `'tiles'`, so nothing rendered a carousel).
Both are now seeded, DELETE-then-INSERT with fixed ids, idempotent:

- carousel: `UPDATE promotion_section SET display_type='carousel' WHERE
  id='promo-cat-bot'` + `promo-e2e-carousel-1/2` (image slides, `seed-0383`
  untouched → 3 slides);
- gallery: `pimg-e2e-gallery-1/2` as non-primary images of
  `prod-remera-premium-estampada` (its seeded primary stays primary) → exactly
  one catalog product with a thumbnail strip.

## Verification

| Check | Result |
| --- | --- |
| Public battery (9 spec files, regenerated state) | **153 passed, 0 failed (1.6m)** |
| Admin battery (`npm run test:e2e:admin`) | **50 passed (4.7m)**, no crash |
| Front unit | 71 files / 1347 tests passed |
| Back unit | 50 files / 831 tests passed |
| Production build | 99 pages, exit 0 (smaller than the pre-reset 104 because the regenerated catalog has the seeded 83 products) |
| Production artifact (`astro preview`) | `spa-wiring-revisit`, `carousel-promo-revisit`, `detail-revisit` green; `PAGE_ERRORS: []` |
| Fixture determinism | `seed:e2e` twice → row-stable carousel + gallery rows, one multi-image product, primary preserved |
| Independent probes | carousel 5s intervals `1 → 0 (after nav) → 1`; gallery lock `hidden → ""`, page scrollable; admin modal opens **and closes** after a revisit |

Regression proofs (RED without the fix): gallery wiring deadness (pre-fix
worktree, static artifact: thumbnail swap never happened); carousel orphan
interval (pre-fix component: `Expected 1, Received 2`; `NEUTER_DRAIN` mutation
in dev and prod); admin re-arm (pre-fix worktree: the post-revisit close is dead,
modal never hides); poll/expectation flips for the rewritten specs.

### Environment incident found and resolved

The admin battery initially failed 3/3 because `wrangler dev`/workerd aborts on
the long-lived, drifted local state (241 MB observability store + flow-created
rows): fresh state ran 50/50 green twice, the drifted one crashed every time.
The state was moved aside (`Sublime-Ecommerce-Back/.wrangler/state.bak-20261012-140441`,
248 MB, never deleted) and the seed chain re-run. That reset also exposed two
non-deterministic test dependencies (gallery fixture, `detail-volume`'s
hard-coded tier price), both fixed in this change.

## Native review (this round)

The controller refused the whole delta as one candidate:
`lens_context_budget_exceeded` (22 files / 1689 lines, "review this change as
smaller candidates"). It was split into two chained candidates, each reviewed
with the workspace detached at its boundary commit (every commit left intact):

| Candidate | Scope | Outcome |
| --- | --- | --- |
| `8fd3efa..9362cd4` | admin e2e spec, admin re-arm, gallery scroll lock (6 files) | **approved**, receipt burned; one advisory `R3-001` at `src/components/ProductGallery.astro:140` (informational) |
| `9362cd4..dae5ef3` | carousel timers, the three regressions, dead-code removal (15 files) | **approved**, receipt burned; no findings |

The trailing `docs(odd)` commit is the trivial passive-documentation case and
is not a review candidate. The first slice's START also produced one expired
consent envelope (10 minutes without an answer); the retry with a fresh
idempotency key resolved it.

## Commits

- `test(e2e): prove the admin wiring dies on the second SPA visit`
- `fix(admin): re-arm the attribute manager, product form and uploader`
- `fix(gallery): release the stale body scroll lock`
- `fix(carousel): stop the autoplay timers outliving their page`
- `test(e2e): make the gallery, carousel and volume regressions deterministic`
- `chore(cleanup): delete the unreferenced variant and category components`
- `docs(odd): record the admin re-arm, advisory fixes and cleanup`
- Back repo (`test/e2e-gallery-carousel-fixtures`): `test(seed): add deterministic gallery and carousel e2e fixtures`

Note: during commit preparation both repositories had a stale index (a
`git add -A` from a tool plus pruned loose objects left `invalid object` errors
and an invalid cache-tree). `git reset` rebuilt the index, `git fsck
--connectivity-only` is clean again, and no commit content was affected.

## Not in scope (follow-ups, all pre-existing)

- `src/pages/admin/products.astro`'s trigger chain shows the overlay
  synchronously *and* queues an async re-show, so a fast cancel can be defeated;
  the new admin spec settles on the module response and guards the close instead.
- `catalog.spec.ts` / `responsive.spec.ts` category-filter tests flaked once
  under parallel load (green in isolation and on the re-run).
- `pnpm run dev -- <flags>` silently drops the flags (a literal `--` reaches
  wrangler), so the documented rate-limit bypass never applies to the e2e
  backend.
- The admin flows' `reseedE2E()` always reseeds the real local D1.
- Wrangler 4.120.0 is outdated (4.149.0 available); the crash above is a tool
  behaviour on drifted state.
- Repository dirt (`.gga` modifications, `.gga.bak-*`, `openspec/config.yaml`)
  is left untouched and unreported in the diff.
