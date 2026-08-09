/**
 * Promo Canvas — renderer + geometry tests (TDD RED).
 *
 * Pure geometry + HTML-string rendering; NO event binding (the page owns the
 * pointer-event session). Refs: PM-1 (grid canvas), PM-4 (touch ≥44px),
 * AR-2 (canvas sizing: desktop fluid 72–120px, mobile fixed 80px + scroll),
 * AD "Canvas sizing" and "Drag anchor".
 */

import { describe, it, expect } from "vitest";
import type { Grid, GridTile } from "../lib/promo-grid";
import {
  clientToCell,
  cellSizeForGrid,
  renderTileCanvasHtml,
  renderGridLines,
  type CanvasTile,
} from "../lib/promo-canvas";

function tile(overrides: Partial<CanvasTile> = {}): CanvasTile {
  return {
    id: "t1",
    posX: 1,
    posY: 2,
    width: 2,
    height: 1,
    title: "Shop now",
    subtitle: "Summer sale",
    imageUrl: "https://media.sublimepy.store/promo.webp",
    link: "/products/remera",
    ...overrides,
  };
}

function tileSection(html: string, id: string): string {
  return (
    html
      .split('<div class="canvas-tile')
      .find((part) => part.includes(`data-id="${id}"`)) ?? ""
  );
}

describe("clientToCell", () => {
  it("uses Math.floor so a pointer past the cell origin snaps to the next cell", () => {
    const grid: Grid = { cols: 8, rows: 4 };
    expect(clientToCell(0, 0, 80, grid)).toEqual({ x: 0, y: 0 });
    expect(clientToCell(79, 79, 80, grid)).toEqual({ x: 0, y: 0 });
    expect(clientToCell(80, 80, 80, grid)).toEqual({ x: 1, y: 1 });
    expect(clientToCell(199, 159, 80, grid)).toEqual({ x: 2, y: 1 });
  });

  it("clamps negative coordinates to 0", () => {
    expect(clientToCell(-10, -5, 80, { cols: 8, rows: 4 })).toEqual({ x: 0, y: 0 });
  });

  it("clamps to the last cell when beyond the grid", () => {
    expect(clientToCell(700, 300, 80, { cols: 8, rows: 4 })).toEqual({ x: 7, y: 3 });
  });
});

describe("cellSizeForGrid", () => {
  const grid: Grid = { cols: 8, rows: 4 };

  it("desktop: fills the width with cells clamped to 72–120px", () => {
    // 800px / 8 cols = 100px → in range, full width.
    expect(cellSizeForGrid(grid, 800, true)).toBe(100);
    // 2000px / 8 = 250px → clamped to 120px (not full width, bounded).
    expect(cellSizeForGrid(grid, 2000, true)).toBe(120);
    // 500px / 8 = 62.5px → clamped up to 72px (overflows, bounded).
    expect(cellSizeForGrid(grid, 500, true)).toBe(72);
  });

  it("mobile: fixed 80px cell regardless of width (horizontal scroll)", () => {
    expect(cellSizeForGrid(grid, 375, false)).toBe(80);
    expect(cellSizeForGrid(grid, 1440, false)).toBe(80);
  });

  it("guards against a zero/undefined cols", () => {
    expect(cellSizeForGrid({ cols: 0, rows: 4 }, 800, true)).toBe(80);
  });
});

describe("renderGridLines", () => {
  it("renders one vertical + one horizontal line per grid line", () => {
    const html = renderGridLines({ cols: 8, rows: 4 }, 100);
    // Boundary lines at 0..cols (8 col boundaries + right edge = 9).
    const verts = html.match(/class="gl-v"/g) ?? [];
    const hors = html.match(/class="gl-h"/g) ?? [];
    expect(verts).toHaveLength(9); // 8 col boundaries + right edge
    expect(hors).toHaveLength(5); // 4 row boundaries + bottom edge
    expect(html).toContain("left:100px");
    expect(html).toContain("top:100px");
    expect(html).toContain("left:0px");
    expect(html).toContain("top:0px");
  });
});

describe("renderTileCanvasHtml", () => {
  it("positions tiles in percentages of the canvas (left/top/width/height)", () => {
    const html = renderTileCanvasHtml([tile()], { cols: 8, rows: 4 });
    // posX=1/8 → 12.5%, posY=2/4 → 50%, width 2/8 → 25%, height 1/4 → 25%.
    expect(html).toContain("left:12.5%");
    expect(html).toContain("top:50%");
    expect(html).toContain("width:25%");
    expect(html).toContain("height:25%");
  });

  it("renders a tile with a data-id and 8 resize handles when no selection is given", () => {
    const html = renderTileCanvasHtml([tile({ id: "abc" })], { cols: 8, rows: 4 });
    expect(html).toContain('data-id="abc"');
    const handles = html.match(/data-handle="/g) ?? [];
    expect(handles).toHaveLength(8);
    for (const h of ["n", "s", "e", "w", "ne", "nw", "se", "sw"]) {
      expect(html).toContain(`data-handle="${h}"`);
    }
  });

  it("marks handles with a 44px+ hit class for touch", () => {
    const html = renderTileCanvasHtml([tile()], { cols: 8, rows: 4 });
    expect(html).toContain("handle-hit");
  });

  it("renders the real background image resolved from imageUrl", () => {
    const html = renderTileCanvasHtml([tile()], { cols: 8, rows: 4 });
    expect(html).toContain(
      "background-image:url('https://media.sublimepy.store/promo.webp')"
    );
  });

  it("lets the local image URL win over the server image URL", () => {
    const html = renderTileCanvasHtml(
      [tile({ localImageUrl: "blob:https://example.com/draft" })],
      { cols: 8, rows: 4 }
    );
    expect(html).toContain("background-image:url('blob:https://example.com/draft')");
    expect(html).not.toContain("media.sublimepy.store");
  });

  it("falls back to the placeholder when no image is available", () => {
    const html = renderTileCanvasHtml(
      [tile({ imageUrl: null, localImageUrl: null })],
      { cols: 8, rows: 4 }
    );
    expect(html).toContain("placeholder-product.svg");
  });

  it("renders the real title and subtitle text", () => {
    const html = renderTileCanvasHtml(
      [tile({ title: "New collection", subtitle: "20% off" })],
      { cols: 8, rows: 4 }
    );
    expect(html).toContain("New collection");
    expect(html).toContain("20% off");
    expect(html).toContain('class="tile-title"');
    expect(html).toContain('class="tile-desc"');
  });

  it("escapes a script tag in the title", () => {
    const html = renderTileCanvasHtml(
      [tile({ title: "<script>alert('x')</script>" })],
      { cols: 8, rows: 4 }
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("sanitizes the tile link href", () => {
    const html = renderTileCanvasHtml(
      [tile({ link: "javascript:alert(1)" })],
      { cols: 8, rows: 4 }
    );
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="#"');
  });

  it("renders resize handles and the edit affordance only on the selected tile", () => {
    const html = renderTileCanvasHtml(
      [tile({ id: "a" }), tile({ id: "b" })],
      { cols: 8, rows: 4 },
      "a"
    );
    const handles = html.match(/data-handle="/g) ?? [];
    expect(handles).toHaveLength(8);
    expect(tileSection(html, "a")).toContain('data-handle="n"');
    expect(tileSection(html, "a")).toContain('data-action="edit"');
    expect(tileSection(html, "b")).not.toContain("resize-handle");
    expect(tileSection(html, "b")).not.toContain('data-action="edit"');
  });

  it("marks the active tile with the selected class", () => {
    const html = renderTileCanvasHtml(
      [tile({ id: "a" }), tile({ id: "b" })],
      { cols: 8, rows: 4 },
      "b"
    );
    expect(html).toContain('<div class="canvas-tile selected" data-id="b"');
    expect(html).toContain('<div class="canvas-tile" data-id="a"');
    expect(html).not.toMatch(/<div class="canvas-tile[^"]*selected[^"]*" data-id="a"/);
  });

  it("renders multiple tiles", () => {
    const html = renderTileCanvasHtml([tile({ id: "a", posX: 0, posY: 0 }), tile({ id: "b", posX: 3, posY: 1 })], { cols: 8, rows: 4 });
    expect(html).toContain('data-id="a"');
    expect(html).toContain('data-id="b"');
  });

  it("returns an empty string for an empty tile list", () => {
    expect(renderTileCanvasHtml([], { cols: 8, rows: 4 })).toBe("");
  });

  it("clamps a tile that extends past the grid (percent can exceed but stays consistent)", () => {
    const html = renderTileCanvasHtml([tile({ posX: 7, posY: 3, width: 2, height: 2 })], { cols: 8, rows: 4 });
    expect(html).toContain('data-id="t1"');
  });

  it("uses the real grid_rows for vertical percent (2-row grid)", () => {
    // A full-height tile (h:2) in a 2-row grid spans 100% of the canvas height.
    const full = renderTileCanvasHtml([tile({ posX: 0, posY: 0, width: 4, height: 2 })], { cols: 8, rows: 2 });
    expect(full).toContain("top:0%");
    expect(full).toContain("height:100%");

    // A 1-row tile in a 2-row grid spans 50%.
    const half = renderTileCanvasHtml([tile({ posX: 0, posY: 1, width: 4, height: 1 })], { cols: 8, rows: 2 });
    expect(half).toContain("top:50%");
    expect(half).toContain("height:50%");
  });

  it("uses the real grid_cols for horizontal percent", () => {
    // A 6-wide tile in an 8-col grid spans 75%; in a 4-col grid it would be 150%.
    const html = renderTileCanvasHtml([tile({ posX: 0, posY: 0, width: 6, height: 1 })], { cols: 8, rows: 2 });
    expect(html).toContain("width:75%");
  });
});
