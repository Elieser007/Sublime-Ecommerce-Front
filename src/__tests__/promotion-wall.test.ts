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

describe("PromotionWall promo link sanitization", () => {
  it("normalizes promo links through sanitizePromoUrl", () => {
    expect(promotionWallSource).toContain("sanitizePromoUrl");
  });
});

describe("PromotionWall G8 — gridCols + posY pass-through (PM-1)", () => {
  it("passes gridCols from sectionInfo to TilesPromo", () => {
    expect(promotionWallSource).toContain("gridCols");
    expect(promotionWallSource).toMatch(/sectionInfo\??\.gridCols/);
  });

  it("passes posY through to the tile component props", () => {
    expect(promotionWallSource).toContain("posY");
  });

  it("passes position through unchanged for TilesPromo to map", () => {
    expect(promotionWallSource).toContain("position");
  });
});

describe("TilesPromo G8 — real gridCols + posY rows", () => {
  const tilesSource = readFileSync(
    resolve(__dirname, "../components/promo/TilesPromo.astro"),
    "utf-8"
  );

  it("derives gridCols from sectionInfo.gridCols || 4", () => {
    expect(tilesSource).toContain("gridCols");
    expect(tilesSource).toMatch(/gridCols\s*\|\|\s*4/);
  });

  it("renders grid-row from posY (posY+1 / span height)", () => {
    expect(tilesSource).toContain("posY");
    expect(tilesSource).toMatch(/grid-row/);
  });

  it("maps legacy position to posX via tilePlacement", () => {
    expect(tilesSource).toContain("tilePlacement");
    expect(tilesSource).toContain("posX: promo.position");
  });
});
