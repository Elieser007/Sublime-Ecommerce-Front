/**
 * Variant price/visual sync tests
 *
 * Source-structure tests (Button.test.ts pattern) for defect fixes:
 * - [slug].astro variant-change handler must call updatePriceDisplay()
 * - updatePriceDisplay() must work without price_tiers (no early return)
 * - variant-selector.js _updateSelectedVisuals() must clear previous
 *   visual selection state before painting current one
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── SOURCES ───────────────────────────────────────────────

const slugSource = readFileSync(
  resolve(__dirname, "../../pages/products/[slug].astro"),
  "utf-8"
);
const wcSource = readFileSync(
  resolve(__dirname, "../variant-selector.js"),
  "utf-8"
);

const variantHandlerBody = slugSource.slice(
  slugSource.indexOf("addEventListener('variant-change'"),
  slugSource.indexOf("}) as EventListener);")
);

const priceDisplayBody = slugSource.slice(
  slugSource.indexOf("function updatePriceDisplay() {"),
  slugSource.indexOf("function updateWhatsAppLink")
);

const updateVisualsBody = wcSource.slice(
  wcSource.indexOf("_updateSelectedVisuals() {"),
  wcSource.indexOf("customElements.define")
);

const whatsappLinkBody = slugSource.slice(
  slugSource.indexOf("function updateWhatsAppLink"),
  slugSource.indexOf("document.addEventListener('astro:page-load'")
);

// ─── TESTS ─────────────────────────────────────────────────

describe("[slug].astro — variant-change price sync", () => {
  it("calls updatePriceDisplay() in the variant-change handler", () => {
    expect(variantHandlerBody).toContain("updatePriceDisplay()");
  });

  it("updatePriceDisplay() has no tier early return and falls back to base_price", () => {
    expect(priceDisplayBody).toContain("currentTiers.length > 0 ?");
    expect(priceDisplayBody).not.toContain("if (currentTiers.length === 0) return");
  });
});

describe("variant-selector.js — _updateSelectedVisuals cleanup", () => {
  it("clears previously selected size chips (class + aria-checked)", () => {
    expect(updateVisualsBody).toContain("querySelectorAll('.size-selector__btn--selected')");
    expect(updateVisualsBody).toContain("remove('size-selector__btn--selected')");
    expect(updateVisualsBody).toContain("setAttribute('aria-checked', 'false')");
  });

  it("clears previously selected color circles (class + aria-checked)", () => {
    expect(updateVisualsBody).toContain("querySelectorAll('.color-selector__circle--selected')");
    expect(updateVisualsBody).toContain("remove('color-selector__circle--selected')");
  });

  it("resets material selects to the empty placeholder value", () => {
    expect(updateVisualsBody).toContain("querySelectorAll('.material-selector__select')");
    expect(updateVisualsBody).toContain("value = ''");
  });
});

describe("[slug].astro — WhatsApp link includes selected attributes", () => {
  it("includes selected_attributes in the cart item sent to WhatsApp", () => {
    expect(whatsappLinkBody).toContain("selected_attributes");
    expect(whatsappLinkBody).toContain("buildSelectedAttributes()");
  });

  it("does NOT double-count modifiers: cart item carries base price, not finalPrice", () => {
    expect(whatsappLinkBody).toContain("price: baseForTier");
    expect(whatsappLinkBody).toContain("selected_tier_price: tier ? tier.price : undefined");
  });

  it("defines the shared buildSelectedAttributes helper with type_name", () => {
    expect(slugSource).toContain("function buildSelectedAttributes()");
    expect(slugSource.indexOf("function buildSelectedAttributes()")).toBeLessThan(
      slugSource.indexOf("function updateWhatsAppLink")
    );
    expect(slugSource.slice(
      slugSource.indexOf("function buildSelectedAttributes()"),
      slugSource.indexOf("function updatePriceDisplay()")
    )).toContain("type_name");
  });
});
