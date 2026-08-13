# Tasks: Quantity 9999 & Dynamic Width

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~230 (200–260) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Full change (T1–T8, ~230) | PR 1 | `pnpm test src/lib/qty-width.test.ts src/lib/cart.test.ts src/__tests__/quantity-selection.test.ts` | `pnpm exec playwright test e2e/cart.spec.ts` (dev :4321) | Revert single commit — old bounds + fixed widths restore; 9999 e2e seeds are test-only |

## Phase 1: Width helper (TDD)

- [x] **1.1 [T1 RED]** Write `src/lib/qty-width.test.ts`: `qtyDisplayWidth(1)`→`calc(1ch + 24px)`; `(9999)`→`calc(4ch + 24px)`; `(12)`→`calc(2ch + 24px)`; `(2.5)`→`calc(3ch + 24px)`.
- [x] **1.2 [T2 GREEN]** Create `src/lib/qty-width.ts`: `export function qtyDisplayWidth(value: number)` → `calc(${String(value).length}ch + 24px)` (fails wide). Dep: 1.1. AC: 1.1 green.

## Phase 2: Cart upper clamp (TDD)

- [x] **2.1 [T3 RED]** Extend `src/lib/cart.test.ts` (mock pattern): `updateCartQuantity('1', 10000)`→9999; `(0)`→1; `addToCart` qty 10000→9999; `addToCartWithOptions` 10000→9999; existing 9999 + addToCart(1) stays 9999; `MAX_QUANTITY` import `=== 9999`.
- [x] **2.2 [T4 GREEN]** `src/lib/cart.js`: `export const MAX_QUANTITY = 9999`; clamp `updateCartQuantity` (L130), `addToCart` (L49/L57), `addToCartWithOptions` (L80/L96) via `Math.min(MAX_QUANTITY, ...)` (existing-item increments clamp the sum); leave `sanitizeQuantity` validity-only. Dep: 2.1. AC: 2.1 green.

## Phase 3: Component & page markers (TDD)

- [x] **3.1 [T5 RED]** Create `src/__tests__/quantity-selection.test.ts` (readFileSync markers): number-input.js has `'9999'`, `qtyDisplayWidth`, `style.width`, `min-width: 40px`, `min-width: 44px`; variant-modal.js has `next > 9999`, `qtyDisplayWidth(this._quantity)`, `min-width: 40px`; `[slug].astro` has `data-max="9999"` + `Math.min(9999, qty)`; cart.astro has `data-max="9999"`, `150px 110px 40px`, `140px 110px 36px`; NumberInput.astro has `max = 9999`.
- [x] **3.2 [T6 GREEN]** `src/components/number-input.js`: L30/L46 `#max` default 9999; `#updateDisplay()` (87–90) adds `input.style.width = qtyDisplayWidth(this.#value)`; re-apply at end of `#render()` (L163); `.qty-display` CSS (141–142) → `width: auto; min-width: 40px; padding-inline: 12px; box-sizing: border-box`; mobile (155) `min-width: 44px`.
- [x] **3.3 [T6 GREEN]** `src/components/variant-modal.js`: L378 `next > 99`→`next > 9999`; after `qtyEl.textContent` (L381) set `qtyEl.style.width = qtyDisplayWidth(this._quantity)`; initial paint (L243) inline width; `.qty-value` CSS (678–691) min-width 40px + `width: auto; padding-inline: 12px; box-sizing: border-box`; mobile (744) `min-width: 44px`.
- [x] **3.4 [T6 GREEN]** `src/pages/products/[slug].astro`: L133 `data-max="9999"`; L439 comment → "clamps to 9999"; L447 `Math.min(9999, qty)`; KEEP L448 `.qty-display')?.focus()`.
- [x] **3.5 [T6 GREEN]** `src/pages/cart.astro`: L173 grid `80px 1fr 150px 110px 40px`; L476 `70px 1fr 140px 110px 36px`; L680 `data-max="9999"`.
- [x] **3.6 [T6 GREEN]** `src/components/NumberInput.astro`: L13/L27/L44 default 9999 (doc block, usage example, prop default). Dep: 3.1. AC: 3.1 green.

## Phase 4: Regression + E2E (verification)

- [x] **4.1 [T7]** Run full `pnpm test` — untouched suites green: detail-volume D4 strings, getStaticPaths `.qty-display')?.focus()`, `sanitizeQuantity(2.5)` pass-through, mobile ≥40px buttons, admin inputs unchanged.
- [x] **4.2 [T8]** Extend `e2e/cart.spec.ts` — 3 new cases: desktop (seed qty 9999, assert `scrollWidth <= clientWidth + 1`); tablet 700×800 (9999 renders, no clipping/wrap); mobile (input shows "9999", inc disabled at max, no overflow).
- [x] **4.3 [Gate]** `pnpm test` && `pnpm exec playwright test` (full suite) green. Dep: all.

## Coverage Trace

- REQ-1 Unified 9999 → 2.2, 3.2, 3.4, 3.5, 3.6, 4.2
- REQ-2 Library clamp → 2.1, 2.2
- REQ-3 Dynamic width → 1.1, 1.2, 3.2, 3.3
- REQ-4 Cart grid fit → 3.5, 4.2
- REQ-5 No-regression → 2.1, 4.1, 4.2
- Non-goals → 2.2 (sanitizeQuantity untouched), 4.1 (admin inputs, price-utils/whatsapp/PriceTierList untouched)
- Threat matrix: N/A (DOM/JS/CSS only) — no threat RED tasks
