# Proposal: Quantity 9999 & Dynamic Width

## Intent

Customer quantity controls cap at inconsistent limits (detail 999, cart 99, variant modal 99) and the input's fixed 52px/48px width wastes space at 1 digit, underfits at 4. Goal: accept up to 9999 in every customer selector; input width scales with digit count (1 narrow, 4 wide).

## Assumptions (pre-resolved)

1. Customer-facing only; admin inputs (money, sort_order, price modifier, tier min qty) untouched.
2. `MAX_QUANTITY = 9999` exported from `src/lib/cart.js`; lib clamp is the invariant, `data-max` is UX.
3. Width via `qtyDisplayWidth()` (`calc(${digits}ch + 24px)`); Space Mono is monospace, `ch` = exact digit width.
4. `sanitizeQuantity` stays validity-only (fractional pass-through asserted). Single PR ≤ 400 lines.

## Scope

In: `src/lib/qty-width.ts` (new pure helper); `number-input.js` #max 999→9999 + dynamic width in `#updateDisplay()` and after `#render()`, CSS auto width / min 40/44px; `[slug].astro` data-max 9999 + `Math.min(9999, qty)` (keep `.qty-display')?.focus()` and D4 strings); `cart.astro` data-max 9999 + qty grid columns (desktop 140→~150px, tablet 130→~140px); `variant-modal.js` bound 9999 + width on `.qty-value` (init + adjust), CSS min 48/52→40/44px; `cart.js` upper clamp + `MAX_QUANTITY`; `NumberInput.astro` defaults 9999.

Out: admin number inputs; `sanitizeQuantity` semantics; price-utils/whatsapp/PriceTierList logic (correct at 9999).

## Capabilities

New: `quantity-selection` — customer quantity bounds (9999) + digit-driven width (number-input, variant-modal, cart) + lib clamp.
Modified: None (`openspec/specs/` empty).

## Approach

ch-based width from pure helper `qtyDisplayWidth(value)`; number-input value paths (clicks, arrows, data-value, tier-select) funnel through the setter→`#updateDisplay()`, re-applied at end of `#render()`; variant-modal sets width inline on paint/adjust; `updateCartQuantity` clamps `Math.min(MAX_QUANTITY, Math.max(1, quantity))`. TDD: RED tests first (`qtyDisplayWidth`, 10000→9999).

## Affected Areas

| Area | Impact |
|------|--------|
| `src/lib/qty-width.ts` (+ test) | New |
| `src/components/number-input.js`, `src/lib/cart.js` (+ tests), `src/components/NumberInput.astro` | Modified |
| `src/pages/products/[slug].astro`, `src/pages/cart.astro`, `src/components/variant-modal.js` | Modified |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Cart grid clips at 4 digits (columns 140/130px vs control 140px) | High | Widen columns ~150/140px; e2e no-overflow guard (cart.spec.ts:410-415) |
| Source-string tests break (detail-volume D4 178-204; getStaticPaths `.focus()` 241) | Med | Preserve exact snippets; same-commit updates |
| variant-modal min-width blocks narrow state; font fallback; stale width post-`#render()` | Low | Lower min to 40/44px; keep `--font-mono`; re-apply in `#updateDisplay()` |

## Rollback Plan

Revert the single PR commit; previous deploy restores old bounds and fixed widths. Carts with qty > 9999 clamp on next update — no migration.

## Dependencies

None — frontend-only; backend accepts any quantity; WhatsApp stays under wa.me limits.

## Success Criteria

- [ ] Selectors clamp at 9999; `qtyDisplayWidth` 1 digit floor, 4 digits wide (unit RED→GREEN)
- [ ] No horizontal overflow on cart at qty 9999 (e2e)
- [ ] `pnpm test` + `pnpm exec playwright test` pass
