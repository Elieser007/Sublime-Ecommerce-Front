# Design: Quantity 9999 & Dynamic Width

## Technical Approach

One invariant + one formula. `MAX_QUANTITY = 9999` exported from `src/lib/cart.js` is the enforcement point (AGENTS.md: lib is single source of truth); `data-max="9999"` on every customer selector is UX. Width comes from a pure helper `qtyDisplayWidth(value)` returning `calc(${String(value).length}ch + 24px)`; both `<number-input>` and `<variant-modal>` set the display width inline on every value path (setter→`#updateDisplay()` for the input, `_adjustQuantity`/initial paint for the modal), with CSS `width: auto`, `min-width: 40/44px`, `padding-inline: 12px`, `box-sizing: border-box` (shadow DOM does NOT inherit the global reset at `global.css:174` — border-box must be explicit). Cart grid qty columns widen 140→150px desktop / 130→140px tablet. Strict TDD: lib tests RED first, source-string markers next, e2e last.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| Helper semantics | `String(value).length` vs `Math.abs(Math.trunc(value))` | UI values are positive integers (min 1, step 1, readonly input); decimals/negatives only via malformed calls — `String(value).length` matches both spec examples (1→1, 9999→4) and fails wide (safe) | **`String(value).length`** |
| Width application | Inline `style.width` from helper vs CSS attr selectors / `field-sizing` | Inline: one formula, ch auto-scales at both breakpoints (no separate mobile width), converges on existing setter paths; `field-sizing` too new, `size` unreliable for `type=number` | **Inline style via helper** |
| number-input.js test harness | jsdom DOM test vs source-string markers + e2e | vitest is node-only (vitest.config.ts: no environment); no component unit test exists today — adding jsdom breaks repo convention; markers+e2e already cover both components | **No DOM harness — source-string + e2e** (new `quantity-selection.test.ts`) |
| `#max` default source | `dataset.max \|\| '9999'` literal in number-input | Component self-contains; `MAX_QUANTITY` is JS-lib scope, pages set explicit `data-max` anyway | **Literal 9999** (matches existing pattern) |
| Tablet qty column | 140px exact-fit vs 145px | 4-digit control = exactly 140px at 15px font; exact fit is safe (grid overflow is visible; fixed columns 484px < 608px available → no page overflow) | **140px** (spec's "~140px") |

## Width Math (pinned — Space Mono advance = 0.6em)

| Context | 1ch | 4-digit display (4ch+24) | Control total (btn+display+btn) | Fits? |
|---------|-----|--------------------------|--------------------------------|-------|
| number-input desktop (15px, 40px btns) | 9px | 60px | 140px | cart col 150px → 10px slack |
| number-input tablet (15px, 40px btns) | 9px | 60px | 140px | cart col 140px → exact fit, no page overflow |
| number-input mobile (16px, 44px btns) | 9.6px | 62.4px | 150.4px | full-width mobile row |
| variant-modal (14px, 40px btns) | 8.4px | 57.6px | 137.6px | modal 480px wide |
| 1-digit floor | — | 33px → min-width 40px | 120px | visibly narrower than 4-digit ✓ |

## Data Flow

```
click/ArrowUp/data-value/tier-select ──▶ setter (clamps min/max) ──▶ #updateDisplay() ──▶ input.value + input.style.width = qtyDisplayWidth(value)
attributeChangedCallback (data-min/max) ──▶ #render() ──▶ #updateDisplay() (re-applies width post-rebuild)
variant-modal: _adjustQuantity(delta) ──▶ bound next>9999 ──▶ qtyEl.textContent + qtyEl.style.width
cart.astro number-input:change ──▶ updateCartQuantity ──▶ Math.min(MAX_QUANTITY, Math.max(1, qty)) ──▶ saveCart
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/qty-width.ts` | Create | `export function qtyDisplayWidth(value: number): string` |
| `src/lib/qty-width.test.ts` | Create | RED first: `(1)`→`calc(1ch + 24px)`, `(9999)`→`calc(4ch + 24px)`, `(12)`→`calc(2ch + 24px)`, `(2.5)`→`calc(3ch + 24px)` |
| `src/lib/cart.js` | Modify | `export const MAX_QUANTITY = 9999`; clamp `updateCartQuantity` (130) `Math.min(MAX_QUANTITY, Math.max(1, quantity))`; clamp addToCart (49, 57) and addToCartWithOptions (80, 96): `Math.min(MAX_QUANTITY, ...(product.quantity \|\| 1))` — on existing-item increment clamp the sum |
| `src/lib/cart.test.ts` | Modify | RED: `updateCartQuantity('1', 10000)`→9999; `addToCart` qty 10000→9999; `addToCartWithOptions` 10000→9999; existing 9999 + addToCart(1) stays 9999; import `MAX_QUANTITY` (assert `=== 9999`) |
| `src/components/number-input.js` | Modify | Import `qtyDisplayWidth` (mirror product-card.js extensionless style). L10/24 docs, L30 `#max = 9999`, L46 `parseInt(this.dataset.max \|\| '9999', 10)`. `#updateDisplay()` (87-90): add `input.style.width = qtyDisplayWidth(this.#value)`. End of `#render()` (after innerHTML assignment, line 163): add `this.#updateDisplay()`. CSS `.qty-display` (141-142): `width: 52px` → `width: auto; min-width: 40px; padding-inline: 12px; box-sizing: border-box;` (keep `height: 40px`). Mobile (155): `width: 48px` → `min-width: 44px` |
| `src/components/variant-modal.js` | Modify | Import `qtyDisplayWidth`. L378 `next > 99` → `next > 9999`. L381: after `qtyEl.textContent = ...` add `if (qtyEl) qtyEl.style.width = qtyDisplayWidth(this._quantity)`. Initial paint L243: `<span class="qty-value" style="width: ${qtyDisplayWidth(this._quantity)}">${this._quantity}</span>`. CSS `.qty-value` (678-691): `min-width: 48px` → `min-width: 40px` + `width: auto; padding-inline: 12px; box-sizing: border-box`. Mobile (744): `min-width: 52px` → `min-width: 44px` |
| `src/pages/products/[slug].astro` | Modify | L133 `data-max="999"` → `data-max="9999"`; L439 comment "clamps to 999" → "clamps to 9999"; L447 `Math.min(999, qty)` → `Math.min(9999, qty)`; KEEP L448 `.qty-display')?.focus()` |
| `src/pages/cart.astro` | Modify | L173 grid `80px 1fr 140px 110px 40px` → `80px 1fr 150px 110px 40px`; L476 `70px 1fr 130px 110px 36px` → `70px 1fr 140px 110px 36px`; L680 `data-max="99"` → `data-max="9999"` |
| `src/components/NumberInput.astro` | Modify | L13 doc default 999→9999; L27 usage example `max="99"`→`max="9999"`; L44 `max = 999` → `max = 9999` |
| `src/__tests__/quantity-selection.test.ts` | Create | Source-string markers (detail-volume.test.ts pattern): number-input.js contains `'9999'`, `qtyDisplayWidth`, `style.width`, `min-width: 40px`, `min-width: 44px`; variant-modal.js contains `next > 9999`, `qtyDisplayWidth(this._quantity)`, `min-width: 40px`; [slug].astro contains `data-max="9999"`, `Math.min(9999, qty)`; cart.astro contains `data-max="9999"`, `150px 110px 40px`, `140px 110px 36px`; NumberInput.astro contains `max = 9999` |
| `e2e/cart.spec.ts` | Modify | New cases: (1) desktop describe — seed item qty 9999 (`setCart` addInitScript pattern), `scrollWidth <= clientWidth + 1`; (2) new "Cart Page — Tablet" describe (viewport 700×800) — 9999 renders, value visible, no overflow; (3) mobile describe — seed 9999, input shows "9999", inc button disabled (stays at max), no overflow |

## Interfaces / Contracts

```ts
// src/lib/qty-width.ts
export function qtyDisplayWidth(value: number): string
// returns `calc(${String(value).length}ch + 24px)`; fails wide (NaN → "NaN" = 3ch)
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit RED→GREEN | `qty-width.test.ts` (4 cases); `cart.test.ts` clamp cases (5) | vitest, cart.test.ts mock pattern |
| Unit markers | `quantity-selection.test.ts` (~12 assertions) | readFileSync static-source, detail-volume pattern |
| No-regression | detail-volume D4 strings, getStaticPaths `.qty-display')?.focus()`, sanitizeQuantity 2.5, mobile ≥40px buttons | Untouched suites must stay green — exact snippets preserved |
| E2E | desktop/tablet/mobile 9999 no-overflow + clamp-at-max | cart.spec.ts `setCart` seeding; scrollWidth asserts |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. DOM/JS/CSS-only change; `data-max`/`data-value` attributes are inert markup.

## Migration / Rollout

No migration. Single commit, single deploy. Carts with qty > 9999 clamp on next `updateCartQuantity`/`addToCart`. Rollback: revert the one commit — old bounds + fixed widths restore; no data repair needed (e2e 9999 seeds are test-only).

## Sequencing (for sdd-tasks)

1. **T1** RED `qty-width.test.ts` → **T2** GREEN `qty-width.ts`
2. **T3** RED `cart.test.ts` clamp cases → **T4** GREEN `cart.js` (MAX_QUANTITY + 3 clamps)
3. **T5** RED `quantity-selection.test.ts` markers → **T6** GREEN component/page edits (number-input.js, variant-modal.js, [slug].astro, cart.astro, NumberInput.astro)
4. **T7** Full `pnpm test` — existing suites green (no edits to detail-volume/getStaticPaths)
5. **T8** E2E: cart.spec.ts 3 new cases; `pnpm exec playwright test e2e/cart.spec.ts` then full suite
6. Gate: `pnpm test` && `pnpm exec playwright test`

## Open Questions

- [ ] None blocking. Visual check only: tablet 4-digit control sits flush (140px = exact fit) — accept per decision table; bump to 145px only if review flags it.
