/**
 * product-card.js CSS — source-structure test
 *
 * The product card builds its styles inside a shadow-DOM <style> block. An
 * invalid property such as `margin-y` (there is no such shorthand; the
 * logical-properties spelling is `margin-block`) is dropped silently by the
 * CSS pipeline, so the intended spacing never applies and no test would notice.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const cardSource = readFileSync(
  resolve(__dirname, "../components/product-card.js"),
  "utf-8"
);

describe("product-card.js price styles", () => {
  it("spaces the price with margin-block", () => {
    expect(cardSource).toContain("margin-block: var(--_space-xs);");
  });

  it("does not use the invalid margin-y / margin-x shorthands", () => {
    expect(cardSource).not.toContain("margin-y:");
    expect(cardSource).not.toContain("margin-x:");
  });
});
