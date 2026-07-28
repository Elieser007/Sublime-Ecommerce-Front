/**
 * TableAction Component Tests
 *
 * Behavioral tests for the TableAction.astro component:
 * - Props interface contract
 * - Variant rendering (ghost, danger, warning)
 * - Disabled state behavior
 * - Title and aria-label accessibility
 * - Icon rendering with Material Symbols
 * - Focus-visible state
 * - Click handler invocation
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Read the TableAction.astro source to verify structure
 * (Astro components need build-time rendering, so we verify source structure)
 */
const tableActionSource = readFileSync(
  resolve(__dirname, "../admin/TableAction.astro"),
  "utf-8"
);

describe("TableAction.astro — Source Structure", () => {
  describe("Props Interface", () => {
    it("defines all 3 variant options", () => {
      expect(tableActionSource).toContain("'ghost'");
      expect(tableActionSource).toContain("'danger'");
      expect(tableActionSource).toContain("'warning'");
    });

    it("includes icon prop as optional string", () => {
      expect(tableActionSource).toContain("icon?: string");
    });

    it("includes onClick prop as optional string", () => {
      expect(tableActionSource).toContain("onClick?: string");
    });

    it("includes disabled prop as optional boolean", () => {
      expect(tableActionSource).toContain("disabled?: boolean");
    });

    it("includes title prop as optional string", () => {
      expect(tableActionSource).toContain("title?: string");
    });

    it("includes class prop for custom styling", () => {
      expect(tableActionSource).toContain("class?: string");
    });
  });

  describe("Default Values", () => {
    it("defaults variant to ghost", () => {
      expect(tableActionSource).toContain("variant = 'ghost'");
    });

    it("defaults disabled to false", () => {
      expect(tableActionSource).toContain("disabled = false");
    });

    it("defaults title to empty string", () => {
      expect(tableActionSource).toContain("title = ''");
    });

    it("defaults class to empty string", () => {
      expect(tableActionSource).toContain("class: className = ''");
    });
  });

  describe("Template Structure", () => {
    it("renders a button element", () => {
      expect(tableActionSource).toContain("<button");
    });

    it("sets type to button", () => {
      expect(tableActionSource).toContain('type="button"');
    });

    it("applies variant class with ta-btn-- prefix", () => {
      expect(tableActionSource).toContain("`ta-btn--${variant}`");
    });

    it("applies base ta-btn class", () => {
      expect(tableActionSource).toContain("'ta-btn'");
    });

    it("applies title attribute", () => {
      expect(tableActionSource).toContain("title={title}");
    });

    it("applies aria-label from title", () => {
      expect(tableActionSource).toContain("aria-label={title || undefined}");
    });

    it("applies disabled attribute", () => {
      expect(tableActionSource).toContain("disabled={disabled}");
    });

    it("applies onclick handler", () => {
      expect(tableActionSource).toContain("onclick={onClick}");
    });

    it("spreads rest props", () => {
      expect(tableActionSource).toContain("{...rest}");
    });
  });

  describe("Icon vs Slot Rendering", () => {
    it("renders icon with material-symbols-outlined class when icon prop provided", () => {
      expect(tableActionSource).toContain('class="material-symbols-outlined ta-icon"');
    });

    it("renders icon text content from icon prop", () => {
      expect(tableActionSource).toContain("{icon}");
    });

    it("uses conditional rendering for icon vs slot", () => {
      expect(tableActionSource).toContain("{icon ? (");
      expect(tableActionSource).toContain(") : (");
      expect(tableActionSource).toContain("<slot />");
    });
  });

  describe("Scoped Styles", () => {
    it("has scoped style block", () => {
      expect(tableActionSource).toContain("<style>");
      expect(tableActionSource).toContain("</style>");
    });

    it("defines base .ta-btn class", () => {
      expect(tableActionSource).toContain(".ta-btn {");
    });

    it("defines danger variant styles", () => {
      expect(tableActionSource).toContain(".ta-btn--danger");
    });

    it("defines warning variant styles", () => {
      expect(tableActionSource).toContain(".ta-btn--warning");
    });

    it("defines disabled state styles with opacity", () => {
      expect(tableActionSource).toContain(".ta-btn:disabled");
      expect(tableActionSource).toContain("opacity: 0.4");
    });

    it("defines disabled cursor as not-allowed", () => {
      expect(tableActionSource).toContain("cursor: not-allowed");
    });

    it("disables pointer-events when disabled", () => {
      expect(tableActionSource).toContain("pointer-events: none");
    });

    it("removes transform when disabled", () => {
      expect(tableActionSource).toContain("transform: none");
    });

    it("defines focus-visible for accessibility", () => {
      expect(tableActionSource).toContain(":focus-visible");
      expect(tableActionSource).toContain("outline: 2px solid var(--primary)");
      expect(tableActionSource).toContain("outline-offset: 2px");
    });

    it("defines hover state with scale transform", () => {
      expect(tableActionSource).toContain(".ta-btn:hover");
      expect(tableActionSource).toContain("transform: scale(1.1)");
    });

    it("defines active state with scale transform", () => {
      expect(tableActionSource).toContain(".ta-btn:active");
      expect(tableActionSource).toContain("transform: scale(0.95)");
    });

    it("uses design tokens for colors", () => {
      expect(tableActionSource).toContain("var(--primary)");
      expect(tableActionSource).toContain("var(--error)");
      expect(tableActionSource).toContain("var(--tertiary)");
    });
  });
});
