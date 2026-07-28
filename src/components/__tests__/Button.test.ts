/**
 * Button Component Tests
 *
 * Tests for the redesigned Button component:
 * - All 7 variants render correct classes
 * - All 4 sizes apply correct CSS classes
 * - Polymorphic render (button vs a)
 * - Loading state applies aria-busy
 * - Icon rendering with positions
 * - Disabled state handling
 * - Accessibility attributes
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Read the Button.astro source to verify structure
 * (Astro components need build-time rendering, so we verify source structure)
 */
const buttonSource = readFileSync(
  resolve(__dirname, "../Button.astro"),
  "utf-8"
);

describe("Button.astro — Source Structure", () => {
  describe("Props Interface", () => {
    it("defines all 7 variant options", () => {
      expect(buttonSource).toContain("'primary'");
      expect(buttonSource).toContain("'secondary'");
      expect(buttonSource).toContain("'ghost'");
      expect(buttonSource).toContain("'outline'");
      expect(buttonSource).toContain("'danger'");
      expect(buttonSource).toContain("'success'");
      expect(buttonSource).toContain("'warning'");
    });

    it("defines all 4 size options", () => {
      expect(buttonSource).toContain("'sm'");
      expect(buttonSource).toContain("'md'");
      expect(buttonSource).toContain("'lg'");
      expect(buttonSource).toContain("'xl'");
    });

    it("defines icon position options", () => {
      expect(buttonSource).toContain("'left'");
      expect(buttonSource).toContain("'right'");
      expect(buttonSource).toContain("'only'");
    });

    it("includes loading prop", () => {
      expect(buttonSource).toContain("loading?: boolean");
    });

    it("includes disabled prop", () => {
      expect(buttonSource).toContain("disabled?: boolean");
    });

    it("includes href prop for polymorphic rendering", () => {
      expect(buttonSource).toContain("href?: string");
    });

    it("includes type prop for button elements", () => {
      expect(buttonSource).toContain("type?: 'button' | 'submit' | 'reset'");
    });
  });

  describe("Scoped Styles", () => {
    it("has scoped style block", () => {
      expect(buttonSource).toContain("<style>");
      expect(buttonSource).toContain("</style>");
    });

    it("defines base .btn class", () => {
      expect(buttonSource).toContain(".btn {");
    });

    it("defines all variant styles", () => {
      expect(buttonSource).toContain(".btn--primary");
      expect(buttonSource).toContain(".btn--secondary");
      expect(buttonSource).toContain(".btn--ghost");
      expect(buttonSource).toContain(".btn--outline");
      expect(buttonSource).toContain(".btn--danger");
      expect(buttonSource).toContain(".btn--success");
      expect(buttonSource).toContain(".btn--warning");
    });

    it("defines all size styles", () => {
      expect(buttonSource).toContain(".btn--sm");
      expect(buttonSource).toContain(".btn--md");
      expect(buttonSource).toContain(".btn--lg");
      expect(buttonSource).toContain(".btn--xl");
    });

    it("defines loading state styles", () => {
      expect(buttonSource).toContain(".btn--loading");
      expect(buttonSource).toContain("btn-spin");
    });

    it("defines focus-visible for accessibility", () => {
      expect(buttonSource).toContain(":focus-visible");
      expect(buttonSource).toContain("outline: 2px solid var(--primary)");
    });

    it("defines disabled state styles", () => {
      expect(buttonSource).toContain(".btn:disabled");
      expect(buttonSource).toContain("opacity: 0.4");
      expect(buttonSource).toContain("cursor: not-allowed");
    });
  });

  describe("Template Logic", () => {
    it("renders as <a> when href is provided", () => {
      expect(buttonSource).toContain("const Tag = href ? 'a' : 'button'");
    });

    it("applies aria-disabled attribute", () => {
      expect(buttonSource).toContain("aria-disabled");
    });

    it("applies aria-busy for loading state", () => {
      expect(buttonSource).toContain("aria-busy={loading}");
    });

    it("renders spinner when loading", () => {
      expect(buttonSource).toContain("btn-spinner");
    });

    it("renders icon with material-symbols-outlined", () => {
      expect(buttonSource).toContain("material-symbols-outlined");
    });

    it("handles icon-only with aria-label", () => {
      expect(buttonSource).toContain("isIconOnly");
    });

    it("sets type attribute only on buttons, not anchors", () => {
      expect(buttonSource).toContain("type={!href ? type : undefined}");
    });
  });

  describe("Design Tokens", () => {
    it("uses var(--primary) for cyan accent", () => {
      expect(buttonSource).toContain("var(--primary)");
    });

    it("uses var(--secondary) for magenta accent", () => {
      expect(buttonSource).toContain("var(--secondary)");
    });

    it("uses var(--error) for danger variant", () => {
      expect(buttonSource).toContain("var(--error)");
    });

    it("uses var(--tertiary) for warning variant", () => {
      expect(buttonSource).toContain("var(--tertiary)");
    });

    it("uses var(--font-mono) for font family", () => {
      expect(buttonSource).toContain("var(--font-mono)");
    });

    it("uses var(--space-sm) for icon gap", () => {
      expect(buttonSource).toContain("var(--space-sm)");
    });
  });
});
