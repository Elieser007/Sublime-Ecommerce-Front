# Spec: Quantity Selection

## Requirement: Unified maximum quantity 9999

All customer quantity selectors MUST cap at 9999. `<number-input>` MUST default `#max` to 9999, including the parse fallback and docs. `src/pages/products/[slug].astro` and `src/pages/cart.astro` MUST render `data-max="9999"`. `NumberInput.astro` MUST default to 9999. The tier-select handler MUST clamp applied tier minimums with `Math.min(9999, qty)`, keeping the `.qty-display')?.focus()` call.

- GIVEN `<number-input>` with no `data-max` WHEN a value above 9999 is set THEN the value clamps to 9999
- GIVEN a tier-select applies a `min_quantity` above 9999 THEN the value clamps to 9999 AND `.qty-display')?.focus()` still runs
- GIVEN value 9999 WHEN `+` is clicked or ArrowUp pressed THEN the value stays 9999
- GIVEN variant modal `_quantity` 9999 WHEN the + button is clicked THEN the quantity stays 9999

## Requirement: Library upper clamp

`src/lib/cart.js` MUST export `MAX_QUANTITY = 9999`. `updateCartQuantity` MUST clamp with `Math.min(MAX_QUANTITY, Math.max(1, quantity))`. `addToCart`/`addToCartWithOptions` MUST apply the same clamp to stored quantities. `sanitizeQuantity` MUST remain validity-only, preserving fractional pass-through.

- GIVEN `updateCartQuantity(10000)` THEN the stored quantity is 9999
- GIVEN `updateCartQuantity(0)` THEN the stored quantity is 1
- GIVEN `addToCart` with quantity 10000 THEN the stored cart item has quantity 9999
- GIVEN `sanitizeQuantity(2.5)` THEN 2.5 is returned unchanged

## Requirement: Digit-driven dynamic width

A pure helper `qtyDisplayWidth(value)` MUST return `calc(${digits}ch + 24px)`, with `digits` the decimal length of `value`. `<number-input>` MUST set `.qty-display` width on every value change and re-apply after each render. The variant modal MUST apply it to `.qty-value` at initial paint and on every `_adjustQuantity`. Both components MUST style the display with `width: auto`, `min-width: 40px` (44px mobile), `padding-inline: 12px`, `box-sizing: border-box`.

- GIVEN value 1 WHEN `qtyDisplayWidth(1)` THEN returns `calc(1ch + 24px)`
- GIVEN value 9999 WHEN `qtyDisplayWidth(9999)` THEN returns `calc(4ch + 24px)`
- GIVEN value 1 WHEN `+` is clicked 9998 times THEN the width grows to 4 digits
- GIVEN value 9999 WHEN ArrowDown is pressed THEN the width shrinks to the 3-digit width
- GIVEN a `data-value` change or tier-select sets the value THEN the width matches the new digit count
- GIVEN two controls at values 1 and 9999 THEN the 1-digit control is visibly narrower than the 4-digit control

## Requirement: Cart grid fit at four digits

The cart grid MUST fit a 4-digit control: the qty column MUST widen from 140px to ~150px desktop and 130px to ~140px tablet. A cart holding quantity 9999 MUST render without horizontal overflow.

- GIVEN a cart item with quantity 9999 WHEN rendering `/cart` at desktop THEN `scrollWidth <= clientWidth + 1`
- GIVEN a cart item with quantity 9999 WHEN rendering `/cart` at tablet THEN the quantity control renders without clipping or wrapping

## Requirement: No-regression invariants

Existing behavior MUST be preserved: minimum quantity 1; tier badge and subtotal re-render on cart change; PriceTierList row highlight via `number-input:change`; WhatsApp message built from current quantities; the detail-volume D4 strings and the `.qty-display')?.focus()` string; mobile stepper buttons with ≥ 40px touch targets; detail-volume price at quantity 10.

- GIVEN a quantity below 1 WHEN updating the cart THEN it clamps to 1
- GIVEN a quantity change on `/cart` THEN tier badge and subtotal re-render AND the WhatsApp message reflects the new quantity
- GIVEN the detail-volume and getStaticPaths source-string suites THEN the asserted snippets (D4 strings, `.qty-display')?.focus()`) still match
- GIVEN the cart at quantity bounds WHEN clicking inc/dec THEN bounds hold AND mobile buttons are ≥ 40px tall
- GIVEN quantity 10 on a tiered product THEN the displayed price matches the seeded 117.000 expectation

## Non-Goals

Admin number inputs (money, sort_order, price modifier, tier min quantity) MUST NOT change. `sanitizeQuantity` semantics MUST NOT change. `price-utils`, `whatsapp`, and `PriceTierList` logic MUST NOT change — correct at any quantity.

- GIVEN the admin products page THEN all admin number inputs keep their current bounds
- GIVEN quantity 9999 THEN tier resolution and WhatsApp building are unchanged
