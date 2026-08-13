# Archive Report — quantity-9999-dynamic-width

**Change**: quantity-9999-dynamic-width
**Archived**: 2026-08-13
**Project**: Sublime-Ecommerce-Front (Astro 7 SSG)
**Final verdict**: PASS — archived 2026-08-13
**Artifact store**: hybrid (filesystem archive + Engram topic `sdd/quantity-9999-dynamic-width/archive-report`)
**Phase**: sdd-archive (terminal) — SDD cycle complete

## Status

The SDD cycle is COMPLETE and verified. All 13/13 tasks are checked in the persisted tasks artifact (0 unchecked — validated at archive time from the archived copy); the delta spec was synced to the container main spec as a new capability; the change folder was moved to the archive with an empty `diff -r` readback. This report is the terminal record of the cycle and describes the state AT CLOSE; where intermediate snapshots (`apply-progress`, `verify-report`) differ from final facts, the higher-ranked sources (native review authority, persisted tasks artifact, orchestrator launch prompt) govern.

## Final State (at close)

| Dimension | Final state |
|-----------|-------------|
| Tasks | 13/13 complete |
| Spec compliance | 6/6 requirements, 23/23 scenarios compliant (per verify-report evidence revision `sha256:2f0b4a97…b210`) |
| Implementation | Shipped on `main`, 5 commits: `740f432` (helper), `a1141e0` (clamp), `0f6b4c8` (selectors), `d532631` (e2e), `306086e` (docs+progress) |
| Unit suite | 1337/1337 passed (67 files), exit 0 |
| E2E (chromium) | 148/148 passed, exit 0 — includes 3 new 9999 breakpoint cases (desktop/tablet/mobile) |
| Build | Exit 0, 104 pages (strict TS via `astro/tsconfigs/strict`) |
| CRITICAL findings | 0 |
| Blockers | 0 |

## What Shipped

Unified customer quantity cap at **9999** plus digit-driven dynamic width for every customer quantity selector:

- `src/lib/qty-width.ts` (new, +4 RED-first tests) — pure helper `qtyDisplayWidth(value)` → `calc(${String(value).length}ch + 24px)`, fails wide.
- `src/lib/cart.js` — `export const MAX_QUANTITY = 9999`; `Math.min(MAX_QUANTITY, Math.max(1, qty))` clamps in `updateCartQuantity`, `addToCart` (new + existing-sum), `addToCartWithOptions` (new + existing-sum). `sanitizeQuantity` stays validity-only (fractional pass-through preserved).
- `src/components/number-input.js` — `#max` default 9999 (parse fallback `'9999'`); width applied in `#updateDisplay()` on every value path and re-applied at end of `#render()`; `.qty-display` → `width: auto; min-width: 40px; padding-inline: 12px; box-sizing: border-box` (mobile `min-width: 44px`).
- `src/components/variant-modal.js` — `_adjustQuantity` bound `next > 9999`; width set on `.qty-value` at initial paint + every adjust; CSS min-width 48→40px (mobile 52→44px).
- `src/pages/products/[slug].astro` — `data-max="9999"`, `Math.min(9999, qty)` tier clamp, `.qty-display')?.focus()` preserved verbatim.
- `src/pages/cart.astro` — qty grid columns 140→150px desktop / 130→140px tablet; `data-max="9999"`.
- `src/components/NumberInput.astro` — defaults/docs → 9999.
- `src/__tests__/quantity-selection.test.ts` (new, 14 source-string markers), `e2e/cart.spec.ts` (3 new cases: desktop `scrollWidth <= clientWidth + 1`, tablet 700×800 no-clip, mobile at-max disabled + no overflow).

Non-goals verified by empty diff (`git diff 0e23acd..HEAD` on admin/, price-utils, whatsapp, PriceTierList): admin inputs, `sanitizeQuantity`, `price-utils`/`whatsapp`/`PriceTierList` logic all untouched.

## Spec Sync

**New capability `quantity-selection`** — no main spec existed. Per the mechanical copy contract (never Read→Write artifact content), the delta spec was copied byte-identically to the container main spec `openspec/specs/quantity-selection/spec.md` (verified by `diff -r`, exit 0). This matches the `product-gallery-lightbox` archive convention (delta synced to the container OpenSpec source of truth; container `openspec/specs/` holds the main specs; the Front repo keeps change folders only).

- Added: `quantity-selection` main spec — 5 requirement blocks (Unified maximum quantity 9999, Library upper clamp, Digit-driven dynamic width, Cart grid fit at four digits, No-regression invariants) + Non-Goals.
- No destructive merge (new-capability creation only); no confirmation needed.
- Informational note: the delta uses `## Requirement:` heading depth and `- GIVEN` scenario bullets (Front delta format), while the container main specs use `### Requirement:` / `#### Scenario:`. The copy is byte-identical per the mechanical contract; heading-depth normalization is a possible future consolidation pass, not a defect.

## Verification Summary (final state)

| Metric | Result |
|--------|--------|
| Verdict | PASS — `verify-report` evidence revision `sha256:2f0b4a97…b210`, verdict `pass`, blockers 0, critical_findings 0 |
| Tasks | 13/13 checked in archived `tasks.md` (0 unchecked — no archive-time reconciliation needed) |
| Spec scenarios | 23/23 compliant |
| Unit tests | 1337/1337 (67 files), exit 0 |
| E2E chromium | 148/148, exit 0 (3 new 9999 cases) |
| Build | 104 pages, exit 0 |
| Admin e2e (informational) | 9 failed in combined serial runs only; pass standalone; zero admin diff — pre-existing, environmental |

## Review Gate (Native)

No `reviewGate` present in structured status at archive time (no native review receipt exists for this candidate — the kill switch offer path was declined by proceeding; declining is not a verb and nothing is recorded). Archive proceeded under ordinary repository policy. This differs from `english-routes-and-wishlist`, whose folder was retained in place because its native review receipt pinned the exact paths digest; no such receipt constrains this change, so the standard move-to-archive convention applies.

## Review Workload / Runtime Ledger (recorded, resolved)

- Initial acquire forecast: ~230 changed lines (200–260), 400-line budget risk **Low**, single PR.
- Apply attempt measured **650 changed lines** vs the 260 acquire → settle returned `blocked(maintainer_decision)`; maintainer approved rescope; objective reset (reset candidate tree `4afda549`).
- Verify attempt acquired with a 50-line budget, settled `complete` — verdict pass, evidence revision `sha256:2f0b4a97…b210` (matches the persisted verify-report envelope).
- Delivery resolved to **single PR scope** (auto-chain resolved; forecast Low). Commits are already on `main`; **no PR/push created** — user-owned delivery step.

## Deviations / Findings (final)

- **W-1 (final, accepted at close)**: `number-input.js` component-contract JSDoc header (33 lines, stale 999/99 values) was REMOVED — enforced by the repo's GG-Angel pre-commit/commit-msg gate (`gga run`, `.gga` config `RULES_FILE=AGENTS.md`; `number-input.js` is not on the AGENTS.md exemption list). The component contract docs survive in `src/components/NumberInput.astro`. Non-behavioral. Also `qty-width.ts` JSDoc removed by the same gate (rationale preserved in design.md; recorded as S-1 suggestion in verify-report).
- **W-2 (environmental, pre-existing)**: 9 admin e2e failures occur only in combined serial runs (`reseedE2E()` racing the `wrangler dev`-held D1); the identical flows pass standalone (products 7/7 verified). Zero admin diff in this change (empty `git diff 0e23acd..HEAD` on admin/price-utils/whatsapp/PriceTierList). Cannot be caused by this change.
- **W-3 (pre-existing)**: untracked `openspec/changes/archive/` dir kept out of this change's history deliberately. No drift in the change's own files.
- Pre-existing repo issue worked around (not fixed) during apply: corrupted git cache-tree + opencode autostage index entries without materializing blobs; worked around via `git read-tree HEAD` + explicit `git add`. Recommend `git gc`/`git fsck` follow-up.

## Delivery

Single PR scope, 5 commits on `main` (`740f432` `a1141e0` `0f6b4c8` `d532631` `306086e`). No branch, no PR, no push — user-owned delivery step. Rollback: revert the commits; old bounds and fixed widths restore; carts with qty > 9999 clamp on next update — no migration.

## Intentional Deviations / Exceptions

- None. Archive is NOT partial, no stale-checkbox reconciliation was needed, no intentional-with-warnings override required (W-1/W-2/W-3 are documented, non-blocking, and accepted at close).
- Root `TASKS.md` not updated: it is the original v1.0 prompt checklist (34/34 completed), not an SDD change tracker; repo convention does not mark SDD changes there.

## Traceability

Artifacts archived: proposal.md, specs/quantity-selection/spec.md, design.md, tasks.md, apply-progress.md, verify-report.md, archive-report.md (additive-only — excluded from the move readback; it did not exist in the source snapshot).

Engram observation IDs read for this report: proposal #1411, spec #1412, design #1413, tasks #1414, apply-progress #1419, verify-report #1428 (exploration #1410 exists from the earlier phase). Engram topic for this artifact: `sdd/quantity-9999-dynamic-width/archive-report` (project `sublime-ecommerce-front`).
