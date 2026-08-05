import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const promotionWallSource = readFileSync(
  resolve(__dirname, "../components/PromotionWall.astro"),
  "utf-8"
);

describe("PromotionWall promo image fallback", () => {
  it("normalizes promo imageUrl through getProductImageUrl", () => {
    expect(promotionWallSource).toContain("getProductImageUrl");
  });

  it("does not interpolate a raw null imageUrl into a CSS url()", () => {
    expect(promotionWallSource).not.toMatch(/url\('\$\{promo\.imageUrl\}'\)/);
  });
});
