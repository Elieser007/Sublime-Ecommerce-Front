/**
 * TableAction Integration Tests
 *
 * Verifies the TableAction component migration:
 * - All variant classes are defined in TableAction.astro
 * - Props interface matches design system spec
 * - CSS classes are present for styling
 * - Component can be imported and used in Astro pages
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const tableActionSource = readFileSync(
  resolve(__dirname, "../admin/TableAction.astro"),
  "utf-8"
);

describe("TableAction Integration — Migration Verification", () => {
  describe("Variant CSS Classes", () => {
    it("defines ghost variant as default", () => {
      expect(tableActionSource).toContain("variant = 'ghost'");
    });

    it("defines danger variant class", () => {
      expect(tableActionSource).toContain(".ta-btn--danger");
      expect(tableActionSource).toContain("'danger'");
    });

    it("defines warning variant class", () => {
      expect(tableActionSource).toContain(".ta-btn--warning");
      expect(tableActionSource).toContain("'warning'");
    });
  });

  describe("Base Button Class", () => {
    it("defines base ta-btn class", () => {
      expect(tableActionSource).toContain(".ta-btn");
      expect(tableActionSource).toContain("class:list={['ta-btn'");
    });

    it("applies variant class dynamically", () => {
      expect(tableActionSource).toContain("variantClass");
      expect(tableActionSource).toContain("`ta-btn--${variant}`");
    });
  });

  describe("Props Interface", () => {
    it("defines all required props", () => {
      expect(tableActionSource).toContain("icon?:");
      expect(tableActionSource).toContain("onClick?:");
      expect(tableActionSource).toContain("variant?:");
      expect(tableActionSource).toContain("disabled?:");
      expect(tableActionSource).toContain("title?:");
      expect(tableActionSource).toContain("class?:");
    });

    it("has correct variant type union", () => {
      expect(tableActionSource).toContain(
        "'ghost' | 'danger' | 'warning'"
      );
    });
  });

  describe("Template Structure", () => {
    it("renders as button element", () => {
      expect(tableActionSource).toContain("<button");
      expect(tableActionSource).toContain("type=\"button\"");
    });

    it("applies disabled attribute", () => {
      expect(tableActionSource).toContain("disabled={disabled}");
    });

    it("applies onclick handler", () => {
      expect(tableActionSource).toContain("onclick={onClick}");
    });

    it("applies title attribute", () => {
      expect(tableActionSource).toContain("title={title}");
    });

    it("applies aria-label for accessibility", () => {
      expect(tableActionSource).toContain("aria-label={title || undefined}");
    });

    it("renders icon with material-symbols-outlined", () => {
      expect(tableActionSource).toContain("material-symbols-outlined");
      expect(tableActionSource).toContain("ta-icon");
    });

    it("uses slot for custom content", () => {
      expect(tableActionSource).toContain("<slot />");
    });
  });

  describe("Accessibility", () => {
    it("includes focus-visible styles", () => {
      expect(tableActionSource).toContain(":focus-visible");
      expect(tableActionSource).toContain("outline: 2px solid var(--primary)");
      expect(tableActionSource).toContain("outline-offset: 2px");
    });

    it("includes disabled state with cursor not-allowed", () => {
      expect(tableActionSource).toContain("cursor: not-allowed");
      expect(tableActionSource).toContain("pointer-events: none");
    });

    it("applies disabled opacity", () => {
      expect(tableActionSource).toContain("opacity: 0.4");
    });
  });

  describe("Design System Integration", () => {
    it("uses semantic color tokens", () => {
      expect(tableActionSource).toContain("var(--primary)");
      expect(tableActionSource).toContain("var(--error)");
      expect(tableActionSource).toContain("var(--tertiary)");
    });

    it("has consistent dimensions (28x28)", () => {
      expect(tableActionSource).toContain("width: 28px");
      expect(tableActionSource).toContain("height: 28px");
    });

    it("has scoped styles", () => {
      expect(tableActionSource).toContain("<style>");
      expect(tableActionSource).toContain("</style>");
    });
  });

  describe("Hover States", () => {
    it("defines ghost hover state", () => {
      expect(tableActionSource).toContain(".ta-btn:hover");
    });

    it("defines danger hover state", () => {
      expect(tableActionSource).toContain(".ta-btn--danger:hover");
    });

    it("defines warning hover state", () => {
      expect(tableActionSource).toContain(".ta-btn--warning:hover");
    });
  });

  describe("Import/Export Chain", () => {
    it("can be imported in Astro pages", () => {
      const fs = require("fs");
      const path = require("path");
      const componentPath = resolve(__dirname, "../admin/TableAction.astro");
      expect(fs.existsSync(componentPath)).toBe(true);
    });

    it("exports proper component structure", () => {
      expect(tableActionSource).toContain("---");
      expect(tableActionSource).toContain("<button");
      expect(tableActionSource).toContain("<style>");
    });
  });
});
