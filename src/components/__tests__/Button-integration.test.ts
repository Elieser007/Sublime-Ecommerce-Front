/**
 * Button Integration Tests
 *
 * Verifies the button migration is complete:
 * - All variant classes are defined in Button.astro
 * - All size classes are defined
 * - Props interface matches design system spec
 * - CSS classes are present for styling
 * - Component can be imported and used in Astro pages
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const buttonSource = readFileSync(
  resolve(__dirname, "../Button.astro"),
  "utf-8"
);

describe("Button Integration — Migration Verification", () => {
  describe("Variant CSS Classes", () => {
    it("defines primary variant class", () => {
      expect(buttonSource).toContain(".btn--primary");
      expect(buttonSource).toContain("variant = 'primary'");
    });

    it("defines secondary variant class", () => {
      expect(buttonSource).toContain(".btn--secondary");
      expect(buttonSource).toContain("'secondary'");
    });

    it("defines ghost variant class", () => {
      expect(buttonSource).toContain(".btn--ghost");
      expect(buttonSource).toContain("'ghost'");
    });

    it("defines outline variant class", () => {
      expect(buttonSource).toContain(".btn--outline");
      expect(buttonSource).toContain("'outline'");
    });

    it("defines danger variant class", () => {
      expect(buttonSource).toContain(".btn--danger");
      expect(buttonSource).toContain("'danger'");
    });

    it("defines success variant class", () => {
      expect(buttonSource).toContain(".btn--success");
      expect(buttonSource).toContain("'success'");
    });

    it("defines warning variant class", () => {
      expect(buttonSource).toContain(".btn--warning");
      expect(buttonSource).toContain("'warning'");
    });
  });

  describe("Size CSS Classes", () => {
    it("defines sm size class", () => {
      expect(buttonSource).toContain(".btn--sm");
      expect(buttonSource).toContain("'sm'");
    });

    it("defines md size class", () => {
      expect(buttonSource).toContain(".btn--md");
      expect(buttonSource).toContain("'md'");
    });

    it("defines lg size class", () => {
      expect(buttonSource).toContain(".btn--lg");
      expect(buttonSource).toContain("'lg'");
    });

    it("defines xl size class", () => {
      expect(buttonSource).toContain(".btn--xl");
      expect(buttonSource).toContain("'xl'");
    });
  });

  describe("Props Interface", () => {
    it("defines all required props", () => {
      expect(buttonSource).toContain("variant?:");
      expect(buttonSource).toContain("size?:");
      expect(buttonSource).toContain("icon?:");
      expect(buttonSource).toContain("iconPosition?:");
      expect(buttonSource).toContain("href?:");
      expect(buttonSource).toContain("type?:");
      expect(buttonSource).toContain("class?:");
      expect(buttonSource).toContain("disabled?:");
      expect(buttonSource).toContain("loading?:");
    });

    it("has correct variant type union", () => {
      expect(buttonSource).toContain(
        "'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success' | 'warning'"
      );
    });

    it("has correct size type union", () => {
      expect(buttonSource).toContain("'sm' | 'md' | 'lg' | 'xl'");
    });

    it("has correct iconPosition type union", () => {
      expect(buttonSource).toContain("'left' | 'right' | 'only'");
    });
  });

  describe("Template Structure", () => {
    it("applies variant class dynamically", () => {
      expect(buttonSource).toContain("`btn--${variant}`");
    });

    it("applies size class dynamically", () => {
      expect(buttonSource).toContain("`btn--${size}`");
    });

    it("applies loading class conditionally", () => {
      expect(buttonSource).toContain("loading && 'btn--loading'");
    });

    it("renders as button by default", () => {
      expect(buttonSource).toContain("const Tag = href ? 'a' : 'button'");
    });

    it("applies disabled attribute on buttons", () => {
      expect(buttonSource).toContain("disabled={!href ? disabled : undefined}");
    });

    it("applies aria-disabled for accessibility", () => {
      expect(buttonSource).toContain("aria-disabled={disabled || loading}");
    });

    it("applies aria-busy for loading state", () => {
      expect(buttonSource).toContain("aria-busy={loading}");
    });
  });

  describe("Accessibility", () => {
    it("includes focus-visible styles", () => {
      expect(buttonSource).toContain(":focus-visible");
      expect(buttonSource).toContain("outline: 2px solid var(--primary)");
      expect(buttonSource).toContain("outline-offset: 2px");
    });

    it("includes disabled state with cursor not-allowed", () => {
      expect(buttonSource).toContain("cursor: not-allowed");
      expect(buttonSource).toContain("pointer-events: none");
    });

    it("handles icon-only buttons with aria-label", () => {
      expect(buttonSource).toContain("isIconOnly");
      expect(buttonSource).toContain("aria-label");
    });
  });

  describe("Design System Integration", () => {
    it("uses semantic color tokens", () => {
      expect(buttonSource).toContain("var(--primary)");
      expect(buttonSource).toContain("var(--secondary)");
      expect(buttonSource).toContain("var(--error)");
      expect(buttonSource).toContain("var(--tertiary)");
    });

    it("uses semantic spacing tokens", () => {
      expect(buttonSource).toContain("var(--space-sm)");
    });

    it("uses font-mono for consistency", () => {
      expect(buttonSource).toContain("var(--font-mono)");
    });

    it("has scoped styles", () => {
      expect(buttonSource).toContain("<style>");
      expect(buttonSource).toContain("</style>");
    });
  });

  describe("Import/Export Chain", () => {
    it("can be imported in Astro pages", () => {
      // Verify the component file exists and is readable
      const fs = require("fs");
      const path = require("path");
      const componentPath = resolve(__dirname, "../Button.astro");
      expect(fs.existsSync(componentPath)).toBe(true);
    });

    it("exports proper component structure", () => {
      // Verify component has frontmatter (---) for Astro
      expect(buttonSource).toContain("---");
      // Verify component has HTML template
      expect(buttonSource).toContain("<Tag");
      // Verify component has style block
      expect(buttonSource).toContain("<style>");
    });
  });
});
