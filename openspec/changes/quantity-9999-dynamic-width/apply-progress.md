# Apply Progress — Quantity 9999 & Dynamic Width

**Change**: `quantity-9999-dynamic-width` (Sublime-Ecommerce-Front)
**Mode**: Strict TDD (vitest unit RED→GREEN→TRIANGULATE→REFACTOR; source-string markers; Playwright e2e last)
**Delivery**: single PR — no branches created; 5 work-unit commits on `main`
**Status**: 13/13 tasks complete — READY FOR VERIFY

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 [T1 RED] | `src/lib/qty-width.test.ts` | Unit | N/A (new file) | ✅ Written (module missing → load failure) | ✅ 4/4 | ✅ 4 cases (1, 9999, 12, 2.5) | ➖ None needed (1-line pure fn) |
| 1.2 [T2 GREEN] | `src/lib/qty-width.test.ts` | Unit | N/A (new file) | ✅ (from 1.1) | ✅ 4/4 | ✅ covered by 1.1 cases | ✅ header comment removed to pass GG-Angel commit gate |
| 2.1 [T3 RED] | `src/lib/cart.test.ts` | Unit | ✅ 100/100 | ✅ 5 new failing (4 clamps + `MAX_QUANTITY` undefined) | — | ✅ 5 cases | — |
| 2.2 [T4 GREEN] | `src/lib/cart.test.ts` | Unit | ✅ 100/100 | ✅ (from 2.1) | ✅ 105/105 | ✅ sum-clamp case (9999+1) | ✅ `Math.min(MAX_QUANTITY, ...)` via exported constant |
| 3.1 [T5 RED] | `src/__tests__/quantity-selection.test.ts` | Unit markers | N/A (new file) | ✅ 13/14 failed (only `MAX_QUANTITY = 9999` already green from T4) | — | ✅ 14 assertions across 6 files | — |
| 3.2 [T6 GREEN] | markers + e2e | Unit markers | ✅ detail-volume/getStaticPaths/cart green | ✅ (from 3.1) | ✅ 14/14 | ✅ width re-applied on setter AND render | ✅ JSDoc header removed (convention gate) |
| 3.3 [T6 GREEN] | markers + e2e | Unit markers | ✅ same | ✅ (from 3.1) | ✅ 14/14 | ✅ initial paint + every `_adjustQuantity` | ➖ None needed |
| 3.4 [T6 GREEN] | markers + e2e | Unit markers | ✅ getStaticPaths `.qty-display')?.focus()` intact | ✅ (from 3.1) | ✅ 14/14 | ✅ comment + clamp + data-max all moved to 9999 | ➖ None needed |
| 3.5 [T6 GREEN] | markers + e2e | Unit markers | ✅ | ✅ (from 3.1) | ✅ 14/14 | ✅ desktop 150px + tablet 140px + data-max | ➖ None needed |
| 3.6 [T6 GREEN] | markers + e2e | Unit markers | ✅ | ✅ (from 3.1) | ✅ 14/14 | ✅ docs + usage + prop default | ➖ None needed |
| 4.1 [T7] | full `pnpm test` | Regression | ✅ 65 files / 1314 tests baseline | — | ✅ 67 files / 1337 tests | ✅ no-regression invariants verified (D4 strings, `.qty-display')?.focus()`, sanitizeQuantity 2.5, ≥40px mobile buttons) | — |
| 4.2 [T8] | `e2e/cart.spec.ts` | E2E | ✅ 27/27 cart cases | ✅ 3 new cases (would fail pre-change: 9999 clipped) | ✅ 30/30 cart | ✅ desktop + tablet (700×800) + mobile | — |
| 4.3 [Gate] | full unit + e2e | Gate | — | — | ✅ `pnpm test` 1337/1337; ✅ chromium project 148/148; ⚠️ full run 150 passed / 9 admin failed (unseeded Back D1, environmental) | — | — |

## Work Unit Evidence

| Work unit | Focused test command + result | Runtime harness + result | Rollback boundary |
|-----------|-------------------------------|--------------------------|-------------------|
| 1 — width helper (T1–T2) | `pnpm exec vitest run src/lib/qty-width.test.ts` → 4/4 pass | N/A — pure function, no runtime boundary | Revert `740f432`; helper + test only |
| 2 — cart clamp (T3–T4) | `pnpm exec vitest run src/lib/cart.test.ts` → 105/105 pass | N/A — LocalStorage lib covered by unit mocks (existing convention) | Revert `a1141e0`; old bounds restore; no data repair (clamp-on-write) |
| 3 — components + pages (T5–T6) | `pnpm exec vitest run src/__tests__/quantity-selection.test.ts src/__tests__/detail-volume.test.ts src/__tests__/getStaticPaths.test.ts src/lib/cart.test.ts src/lib/qty-width.test.ts` → 165/165 pass | `pnpm exec playwright test e2e/cart.spec.ts` → 30/30 pass | Revert `0f6b4c8`; fixed widths + 999 caps restore |
| 4 — e2e (T8) | `pnpm exec playwright test --project=chromium` → 148/148 pass | Dev server :4321 via Playwright webServer (Astro + wrangler booted with `RATE_LIMIT_DISABLED:true ENVIRONMENT:test`) | Revert `d532631`; 9999 e2e seeds are test-only |
| 5 — docs (openspec artifacts) | n/a — planning artifacts | n/a | Revert docs commit; zero runtime impact |

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `src/lib/qty-width.ts` | Created | `qtyDisplayWidth(value)` → `calc(${String(value).length}ch + 24px)` (fails wide) |
| `src/lib/qty-width.test.ts` | Created | 4 cases: 1→1ch, 9999→4ch, 12→2ch, 2.5→3ch |
| `src/lib/cart.js` | Modified | `export const MAX_QUANTITY = 9999`; clamps in `addToCart` (new + existing-sum), `addToCartWithOptions` (new + existing-sum), `updateCartQuantity` (`Math.min(MAX_QUANTITY, Math.max(1, qty))`); `sanitizeQuantity` untouched |
| `src/lib/cart.test.ts` | Modified | 5 new cases: updateCartQuantity 10000→9999, addToCart 10000→9999, sum-clamp 9999+1, addToCartWithOptions 10000→9999, `MAX_QUANTITY === 9999` |
| `src/components/number-input.js` | Modified | Imports `qtyDisplayWidth`; `#max` default 9999 (+`'9999'` parse fallback); `#updateDisplay()` sets `input.style.width`; re-applied at end of `#render()`; `.qty-display` → `width: auto; min-width: 40px; padding-inline: 12px; box-sizing: border-box` (mobile `min-width: 44px`) |
| `src/components/variant-modal.js` | Modified | Imports `qtyDisplayWidth`; `_adjustQuantity` bound `next > 9999`; width set on `.qty-value` at initial paint (inline style) + every adjust; CSS `min-width: 48→40px` + `width: auto; padding-inline: 12px; box-sizing: border-box` (mobile 52→44px) |
| `src/pages/products/[slug].astro` | Modified | `data-max="999"→"9999"` (L133); comment + `Math.min(9999, qty)` (L439/447); `.qty-display')?.focus()` preserved verbatim (L448) |
| `src/pages/cart.astro` | Modified | Grid `140→150px` desktop (L173), `130→140px` tablet (L476); `data-max="99"→"9999"` (L680) |
| `src/components/NumberInput.astro` | Modified | Doc default, usage example, prop default → 9999 |
| `src/__tests__/quantity-selection.test.ts` | Created | 14 source-string markers across 6 files (detail-volume pattern) |
| `e2e/cart.spec.ts` | Modified | 3 new cases: desktop 9999 no-overflow (`scrollWidth <= clientWidth + 1`), tablet 700×800 no-clip/no-overflow (inc button within qty cell box), mobile 9999 at-max (inc disabled) + no overflow |

## Deviations from Design

1. **`number-input.js` JSDoc header removed** — the component-contract header was NOT in the AGENTS.md comment-exemption list; the GG-Angel pre-commit gate rejected the commit with it. The contract docs survive in `NumberInput.astro`'s frontmatter doc block (unchanged). No behavior change.
2. **`qty-width.ts` JSDoc removed** — same convention gate (no-comments rule for non-exempt files). The fail-wide rationale is preserved in `design.md` and this progress record.
3. **Commit-unit grouping** — e2e case split into its own commit (`test(e2e): ...`) rather than bundling with T6; keeps each unit reviewable. No scope change.
4. **Environment server handling** — stopped the pre-existing `wrangler dev` on :8787 (it lacked the required `RATE_LIMIT_DISABLED/ENVIRONMENT` flags; the Playwright config intentionally refuses reuse) and the stale Astro daemon on :4321 so the gate suite could boot its own webServers.
5. **Pre-existing repo issue worked around (not fixed): corrupted git cache-tree + opencode autostage writes index entries without materializing blobs** — caused `invalid object` tree-write failures for the openspec change dir. Worked around via `git read-tree HEAD` (index rebuild) + explicit `git add` of the change dir (writes real blobs) before the docs commit; the untracked `openspec/changes/archive/` dir (previous change) was temporarily moved out of the repo during commits and restored after, to keep it out of this change's history. No repo-internal files altered; recommend `git gc`/`git fsck` follow-up.

## Issues Found

- None in scope. All design line anchors (L130/49/57/80/96 cart.js; L30/46/87-90/141-142/155/163 number-input.js; L378/381/243/678-691/744 variant-modal.js; L133/439/447/448 [slug].astro; L173/476/680 cart.astro; L13/27/44 NumberInput.astro) matched the design exactly.
- Admin e2e flows (9) fail in this environment: Back D1 not seeded for admin (`pnpm run db:migrate && pnpm run seed:e2e` runbook step). Pre-existing, out of scope (change touches no admin code).

## Commits

| Hash | Message |
|------|---------|
| `740f432` | feat(quantity): add digit-driven qtyDisplayWidth helper and tests |
| `a1141e0` | feat(cart): clamp quantities to unified MAX_QUANTITY 9999 |
| `0f6b4c8` | feat(quantity): wire 9999 cap and dynamic width into all selectors |
| `d532631` | test(e2e): cover 9999 quantity overflow and clamp across breakpoints |
| (next) | docs(quantity): persist SDD apply-progress and task checklist |

## Gate Results

- `pnpm test` → **67 files / 1337 tests passed** (baseline 65/1314; +23 new)
- `pnpm exec playwright test --project=chromium` → **148/148 passed** (cart 30, detail-volume, responsive, catalog, wishlist)
- `pnpm exec playwright test` (full) → **150 passed, 9 failed (admin flows — unseeded Back D1), 37 did not run (serial dependency)**
