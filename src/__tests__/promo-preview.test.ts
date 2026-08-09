/**
 * Promotion Preview Builder Tests — TDD
 *
 * Tests for promo-preview.ts pure function buildPromoPreviewHtml():
 * - Tiles uses the gridCols argument
 * - Hero renders only the first promo
 * - Carousel renders all slides and dots/arrows only when more than one
 * - Split alternates the reverse modifier
 * - Banner and ribbon render
 * - Unknown display types return an empty string
 * - User content (title) is HTML-escaped
 */

import { describe, it, expect } from "vitest";
import { buildPromoPreviewHtml, type PromoPreview } from "../lib/promo-preview";

function promo(overrides: Partial<PromoPreview> = {}): PromoPreview {
  return {
    id: "p1",
    title: "Promo title",
    subtitle: "Promo subtitle",
    imageUrl: "https://cdn.example.com/promo.webp",
    link: "/products/remera-sublime-basica-algodon",
    position: 0,
    posY: 0,
    tileCols: 1,
    tileRows: 1,
    ...overrides,
  };
}

describe("buildPromoPreviewHtml tiles", () => {
  it("uses gridCols in the grid template", () => {
    const html = buildPromoPreviewHtml("tiles", [promo()], 3);
    expect(html).toContain("grid-template-columns:repeat(3,1fr)");
  });

  it("positions tiles by posX (position) directly, not modulo gridCols", () => {
    // position IS posX now: posX=4 → column 5 (1-based), no wrap to row 2.
    const html = buildPromoPreviewHtml("tiles", [promo({ position: 4, tileCols: 2, tileRows: 2 })], 4);
    expect(html).toContain("grid-column:5/span 2");
    expect(html).toContain("grid-row:1/span 2");
  });
});

describe("buildPromoPreviewHtml tiles — posX/posY placement (PM-1, G8)", () => {
  it("places a tile at grid-column posX+1 / span width and grid-row posY+1 / span height", () => {
    // posX=2, posY=1, width=3, height=2 → col 3/span 3, row 2/span 2.
    const html = buildPromoPreviewHtml("tiles", [promo({ position: 2, posY: 1, tileCols: 3, tileRows: 2 })], 8);
    expect(html).toContain("grid-column:3/span 3");
    expect(html).toContain("grid-row:2/span 2");
  });

  it("maps the origin tile to col 1 row 1", () => {
    const html = buildPromoPreviewHtml("tiles", [promo({ position: 0, posY: 0, tileCols: 1, tileRows: 1 })], 8);
    expect(html).toContain("grid-column:1/span 1");
    expect(html).toContain("grid-row:1/span 1");
  });

  it("defaults missing posY to row 1 (legacy rows stay at the top)", () => {
    const html = buildPromoPreviewHtml("tiles", [promo({ position: 0, tileCols: 1, tileRows: 1 })], 8);
    expect(html).toContain("grid-row:1/span 1");
  });
});

describe("buildPromoPreviewHtml hero", () => {
  it("renders only the first promo", () => {
    const html = buildPromoPreviewHtml("hero", [
      promo({ id: "first", title: "FIRST TITLE" }),
      promo({ id: "second", title: "SECOND TITLE" }),
    ], 4);
    expect(html).toContain("FIRST TITLE");
    expect(html).not.toContain("SECOND TITLE");
    expect(html).toContain("class=\"hero-promo\"");
  });
});

describe("buildPromoPreviewHtml carousel", () => {
  it("renders every slide", () => {
    const html = buildPromoPreviewHtml("carousel", [
      promo({ id: "a", title: "SLIDE A" }),
      promo({ id: "b", title: "SLIDE B" }),
    ], 4);
    expect(html).toContain("SLIDE A");
    expect(html).toContain("SLIDE B");
    expect(html).toContain("carousel-slide");
  });

  it("renders dots and arrows only when more than one promo", () => {
    const single = buildPromoPreviewHtml("carousel", [promo()], 4);
    expect(single).not.toContain("carousel-dot");
    expect(single).not.toContain("carousel-arrow");

    const multi = buildPromoPreviewHtml("carousel", [promo(), promo()], 4);
    expect(multi).toContain("carousel-dot");
    expect(multi).toContain("carousel-arrow--left");
    expect(multi).toContain("carousel-arrow--right");
  });
});

describe("buildPromoPreviewHtml split", () => {
  it("alternates the reverse modifier on odd items", () => {
    const html = buildPromoPreviewHtml("split", [
      promo({ position: 0, title: "A" }),
      promo({ position: 1, title: "B" }),
      promo({ position: 2, title: "C" }),
    ], 4);
    const classes = html.match(/class="split-item[^"]*"/g) ?? [];
    expect(classes).toHaveLength(3);
    expect(classes[0]).not.toContain("reverse");
    expect(classes[1]).toContain("reverse");
    expect(classes[2]).not.toContain("reverse");
  });
});

describe("buildPromoPreviewHtml banner and ribbon", () => {
  it("renders banner items", () => {
    const html = buildPromoPreviewHtml("banner", [promo()], 4);
    expect(html).toContain("class=\"banner-promo\"");
    expect(html).toContain("class=\"banner-item\"");
    expect(html).toContain("Promo title");
  });

  it("renders ribbon items", () => {
    const html = buildPromoPreviewHtml("ribbon", [promo()], 4);
    expect(html).toContain("class=\"ribbon-promo\"");
    expect(html).toContain("class=\"ribbon-item\"");
    expect(html).toContain("Promo title");
  });
});

describe("buildPromoPreviewHtml unknown types", () => {
  it("returns an empty string for an unknown display type", () => {
    expect(buildPromoPreviewHtml("unknown", [promo()], 4)).toBe("");
  });
});

describe("buildPromoPreviewHtml escaping", () => {
  it("escapes a title containing a script tag", () => {
    const html = buildPromoPreviewHtml("banner", [promo({ title: "<script>alert('x')</script>" })], 4);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("sanitizes a javascript: link to #", () => {
    const html = buildPromoPreviewHtml("banner", [promo({ link: "javascript:alert(1)" })], 4);
    expect(html).not.toContain("javascript:");
    expect(html).toContain("href=\"#\"");
  });
});

describe("buildPromoPreviewHtml real per-type visuals", () => {
  it("hero renders the real image, overlay, title, subtitle and CTA link", () => {
    const html = buildPromoPreviewHtml("hero", [promo()], 4);
    expect(html).toContain("background-image:url('https://cdn.example.com/promo.webp')");
    expect(html).toContain("hero-overlay");
    expect(html).toContain("Promo title");
    expect(html).toContain("Promo subtitle");
    expect(html).toContain("hero-btn");
  });

  it("carousel renders the real image, overlay and slide content for every slide", () => {
    const html = buildPromoPreviewHtml("carousel", [
      promo({ id: "a", title: "Slide A", subtitle: "Desc A" }),
      promo({ id: "b", title: "Slide B", subtitle: "Desc B" }),
    ], 4);
    expect(html).toContain("background-image:url('https://cdn.example.com/promo.webp')");
    expect(html).toContain("slide-overlay");
    expect(html).toContain("Slide A");
    expect(html).toContain("Desc A");
    expect(html).toContain("Slide B");
    expect(html).toContain("Desc B");
  });

  it("split renders the real image via img src plus title and subtitle", () => {
    const html = buildPromoPreviewHtml("split", [promo()], 4);
    expect(html).toContain('src="https://cdn.example.com/promo.webp"');
    expect(html).toContain("Promo title");
    expect(html).toContain("Promo subtitle");
    expect(html).toContain("split-link");
  });

  it("ribbon renders the real background image and overlay", () => {
    const html = buildPromoPreviewHtml("ribbon", [promo()], 4);
    expect(html).toContain("background-image:url('https://cdn.example.com/promo.webp')");
    expect(html).toContain("ribbon-overlay");
    expect(html).toContain("Promo title");
  });

  it("banner renders title and subtitle with no image", () => {
    const html = buildPromoPreviewHtml("banner", [promo()], 4);
    expect(html).toContain("Promo title");
    expect(html).toContain("Promo subtitle");
    expect(html).not.toContain("cdn.example.com");
  });
});

describe("buildPromoPreviewHtml tiles visuals", () => {
  it("delegates tiles to the shared tile builder (bg, overlay, title, subtitle, link)", () => {
    const html = buildPromoPreviewHtml("tiles", [promo()], 4);
    expect(html).toContain("background-image:url('https://cdn.example.com/promo.webp')");
    expect(html).toContain("tile-overlay");
    expect(html).toContain("Promo title");
    expect(html).toContain("Promo subtitle");
    expect(html).toContain("tile-link");
  });

  it("sanitizes the tile link href", () => {
    const html = buildPromoPreviewHtml("tiles", [promo({ link: "javascript:alert(1)" })], 4);
    expect(html).not.toContain("javascript:");
    expect(html).toContain("href=\"#\"");
  });
});

describe("buildPromoPreviewHtml image resolution", () => {
  it("lets the local image URL win over the server image URL", () => {
    const html = buildPromoPreviewHtml("hero", [
      promo({ localImageUrl: "blob:https://example.com/draft" }),
    ], 4);
    expect(html).toContain("background-image:url('blob:https://example.com/draft')");
    expect(html).not.toContain("cdn.example.com");
  });

  it("falls back to the placeholder when no image is available", () => {
    const html = buildPromoPreviewHtml("tiles", [
      promo({ imageUrl: "", localImageUrl: null }),
    ], 4);
    expect(html).toContain("placeholder-product.svg");
  });
});

describe("buildPromoPreviewHtml editor chrome", () => {
  it("adds an edit affordance to every display type", () => {
    for (const type of ["hero", "carousel", "tiles", "split", "banner", "ribbon"]) {
      const html = buildPromoPreviewHtml(type, [promo(), promo()], 4);
      expect(html).toContain('data-action="edit"');
    }
  });
});
