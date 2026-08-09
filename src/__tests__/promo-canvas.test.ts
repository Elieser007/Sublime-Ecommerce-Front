/**
 * Promo Canvas — renderer + geometry tests (TDD RED).
 *
 * Pure geometry + HTML-string rendering; NO event binding (the page owns the
 * pointer-event session). Refs: PM-1 (grid canvas), PM-4 (touch ≥44px),
 * AR-2 (canvas sizing: desktop fluid 72–120px, mobile fixed 80px + scroll),
 * AD "Canvas sizing" and "Drag anchor".
 */

import { describe, it, expect } from "vitest";
import {
  clientToCell,
  cellSizeForGrid,
  renderTileCanvasHtml,
  renderGridLines,
  type GridTile,
  type Grid,
} from "../lib/promo-canvas";

function tile(overrides: Partial<GridTile> = {}): GridTile {
  return { id: "t1", posX: 1, posY: 2, width: 2, height: 1, ...overrides };
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

  it("renders a tile with a data-id and 8 resize handles", () => {
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

  it("renders the tile title as accessible text", () => {
    const html = renderTileCanvasHtml([tile()], { cols: 8, rows: 4 });
    expect(html).toContain("class=\"tile-title\"");
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
});
