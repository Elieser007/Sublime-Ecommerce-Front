import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const cartSource = readFileSync(
  resolve(__dirname, "../pages/cart.astro"),
  "utf-8"
);

describe("Cart image rendering", () => {
  it("routes stored item images through getProductImageUrl", () => {
    expect(cartSource).toContain("getProductImageUrl");
    expect(cartSource).toMatch(/src="\$\{escapeHtml\(getProductImageUrl\(item\.image\)\)\}"/);
  });
});
