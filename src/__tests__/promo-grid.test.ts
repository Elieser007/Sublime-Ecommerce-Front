/**
 * Promo Grid — pure grid math tests (TDD RED).
 *
 * All geometry is in integer cell units. Refs: PM-1, design §Interfaces,
 * AD "Coordinate rounding" (Math.floor snaps to the next cell only past
 * its origin).
 */

import { describe, it, expect } from "vitest";
import {
  clampTile,
  dragToCell,
  resizeToSpans,
  detectCollisions,
  renumberOrder,
  autoSuggestPosition,
  tilePlacement,
  type GridTile,
  type Grid,
  type ResizeHandle,
} from "../lib/promo-grid";

function tile(overrides: Partial<GridTile> = {}): GridTile {
  return { id: "t1", posX: 0, posY: 0, width: 1, height: 1, ...overrides };
}

const grid: Grid = { cols: 8, rows: 4 };

describe("clampTile", () => {
  it("clamps posX to [0, cols-w] and posY to [0, rows-h]", () => {
    const result = clampTile(tile({ posX: 7, posY: 3, width: 2, height: 2 }), grid);
    expect(result).toEqual({ id: "t1", posX: 6, posY: 2, width: 2, height: 2 });
  });

  it("clamps width/height to [1, cols]/[1, rows] and fixes the origin after shrinking", () => {
    const result = clampTile(tile({ posX: 7, posY: 3, width: 5, height: 3 }), grid);
    expect(result.width).toBe(5); // width 5 fits cols 8 at posX 3..7
    expect(result.height).toBe(3); // height 3 fits rows 4 at posY 1..3
    expect(result.posX).toBe(3);
    expect(result.posY).toBe(1);
  });

  it("clamps oversized tiles down to the full grid", () => {
    const result = clampTile(tile({ posX: 0, posY: 0, width: 99, height: 99 }), grid);
    expect(result).toEqual({ id: "t1", posX: 0, posY: 0, width: 8, height: 4 });
  });

  it("keeps an in-bounds tile unchanged", () => {
    const t = tile({ posX: 2, posY: 1, width: 2, height: 1 });
    expect(clampTile(t, grid)).toEqual(t);
  });
});

describe("dragToCell", () => {
  it("snaps the tile top-left to the target cell", () => {
    const result = dragToCell(tile({ width: 2, height: 1 }), { x: 3, y: 2 }, grid);
    expect(result.posX).toBe(3);
    expect(result.posY).toBe(2);
  });

  it("clamps so the tile stays inside the grid", () => {
    const result = dragToCell(tile({ width: 2, height: 2 }), { x: 7, y: 3 }, grid);
    expect(result.posX).toBe(6);
    expect(result.posY).toBe(2);
  });

  it("keeps width/height untouched", () => {
    const result = dragToCell(tile({ width: 3, height: 2 }), { x: 1, y: 1 }, grid);
    expect(result.width).toBe(3);
    expect(result.height).toBe(2);
  });

  it("clamps negative targets to 0", () => {
    const result = dragToCell(tile(), { x: -2, y: -1 }, grid);
    expect(result.posX).toBe(0);
    expect(result.posY).toBe(0);
  });
});

describe("resizeToSpans", () => {
  const base = tile({ posX: 1, posY: 1, width: 2, height: 2 });

  it("southeast handle grows width/height toward the pointer cell", () => {
    const result = resizeToSpans(base, { x: 4, y: 3 }, "se", grid);
    expect(result).toEqual({ id: "t1", posX: 1, posY: 1, width: 4, height: 3 });
  });

  it("e2e scenario: full-height tile in a 2-row grid resized to cell 5 is 6 wide", () => {
    // Seeded tiles section (promo-home-top, 8×2): a 4×2 tile at (0,0) whose SE
    // handle is dragged to cell (5,1) spans cells 0..5 → width 6, and the
    // height stays 2 (clamped to the full grid). Inclusive-cell math:
    // width = cell.x - posX + 1.
    const r = resizeToSpans(
      { id: "t1", posX: 0, posY: 0, width: 4, height: 2 },
      { x: 5, y: 1 },
      "se",
      { cols: 8, rows: 2 }
    );
    expect(r).toEqual({ id: "t1", posX: 0, posY: 0, width: 6, height: 2 });
  });

  it("northwest handle anchors the opposite corner and moves the origin", () => {
    const result = resizeToSpans(base, { x: 0, y: 0 }, "nw", grid);
    expect(result).toEqual({ id: "t1", posX: 0, posY: 0, width: 3, height: 3 });
  });

  it("east/west handles keep height and the anchored y", () => {
    const east = resizeToSpans(base, { x: 5, y: 9 }, "e", grid);
    expect(east).toEqual({ id: "t1", posX: 1, posY: 1, width: 5, height: 2 });
    const west = resizeToSpans(base, { x: 0, y: 9 }, "w", grid);
    expect(west).toEqual({ id: "t1", posX: 0, posY: 1, width: 3, height: 2 });
  });

  it("north/south handles keep width and the anchored x", () => {
    const south = resizeToSpans(base, { x: 9, y: 3 }, "s", grid);
    expect(south).toEqual({ id: "t1", posX: 1, posY: 1, width: 2, height: 3 });
    const north = resizeToSpans(base, { x: 9, y: 0 }, "n", grid);
    expect(north).toEqual({ id: "t1", posX: 1, posY: 0, width: 2, height: 3 });
  });

  it("diagonal handles keep spans at least 1 and in bounds", () => {
    // sw: anchor NE corner (2,1). West edge → x=0 (width 3), south edge → y=3 (height 3).
    const sw = resizeToSpans(base, { x: 0, y: 3 }, "sw", grid);
    expect(sw).toEqual({ id: "t1", posX: 0, posY: 1, width: 3, height: 3 });
    // ne: anchor SW corner (1,2). East edge → x=6 (width 6), north edge → y=0 (height 3).
    const ne = resizeToSpans(base, { x: 6, y: 0 }, "ne", grid);
    expect(ne).toEqual({ id: "t1", posX: 1, posY: 0, width: 6, height: 3 });
  });

  it("never shrinks below 1×1 when the pointer crosses the anchored corner", () => {
    const result = resizeToSpans(base, { x: 100, y: 100 }, "se", grid);
    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThanOrEqual(1);
    expect(result.width).toBeLessThanOrEqual(grid.cols);
    expect(result.height).toBeLessThanOrEqual(grid.rows);
  });
});

describe("detectCollisions", () => {
  it("returns ids of tiles overlapping the moved tile", () => {
    const tiles: GridTile[] = [
      tile({ id: "a", posX: 0, posY: 0, width: 2, height: 2 }),
      tile({ id: "b", posX: 1, posY: 1, width: 1, height: 1 }), // overlaps a
      tile({ id: "c", posX: 3, posY: 0, width: 1, height: 1 }), // clear
    ];
    expect(detectCollisions(tiles, "a")).toEqual(["b"]);
  });

  it("does NOT count edge-touch as a collision (strict overlap only, F11)", () => {
    const tiles: GridTile[] = [
      tile({ id: "a", posX: 0, posY: 0, width: 1, height: 1 }),
      tile({ id: "b", posX: 1, posY: 0, width: 1, height: 1 }), // touches a's east edge
      tile({ id: "c", posX: 0, posY: 1, width: 1, height: 1 }), // touches a's south edge
      tile({ id: "d", posX: 1, posY: 1, width: 1, height: 1 }), // diagonal corner-touch
    ];
    expect(detectCollisions(tiles, "a")).toEqual([]);
  });

  it("counts real overlap where tiles share at least one cell", () => {
    const tiles: GridTile[] = [
      tile({ id: "a", posX: 0, posY: 0, width: 2, height: 2 }),
      tile({ id: "b", posX: 1, posY: 1, width: 1, height: 1 }), // overlaps a's center cell
    ];
    expect(detectCollisions(tiles, "a")).toEqual(["b"]);
  });

  it("reports co-located unsaved tiles with distinct ids in the warning (FIX2)", () => {
    // Two unsaved promos parked on the same cell (overlap is warn-only): each
    // has its own stable localKey, so the collision warning must see both.
    const tiles: GridTile[] = [
      tile({ id: "local-1", posX: 0, posY: 0 }),
      tile({ id: "local-2", posX: 0, posY: 0 }),
    ];
    expect(detectCollisions(tiles, "local-1")).toEqual(["local-2"]);
    expect(detectCollisions(tiles, "local-2")).toEqual(["local-1"]);
  });

  it("excludes the moved tile itself", () => {
    const tiles: GridTile[] = [tile({ id: "a", posX: 0, posY: 0 })];
    expect(detectCollisions(tiles, "a")).toEqual([]);
  });

  it("returns empty when nothing overlaps", () => {
    const tiles: GridTile[] = [
      tile({ id: "a", posX: 0, posY: 0 }),
      tile({ id: "b", posX: 3, posY: 3 }),
    ];
    expect(detectCollisions(tiles, "a")).toEqual([]);
  });
});

describe("renumberOrder", () => {
  it("renumbers posX to the array index (0..n-1)", () => {
    const tiles: GridTile[] = [
      tile({ id: "a", posX: 5 }),
      tile({ id: "b", posX: 0 }),
      tile({ id: "c", posX: 2 }),
    ];
    const result = renumberOrder(tiles);
    expect(result.map((t) => t.posX)).toEqual([0, 1, 2]);
    expect(result.map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps y and spans untouched", () => {
    const tiles: GridTile[] = [tile({ id: "a", posY: 2, width: 2, height: 1 })];
    const result = renumberOrder(tiles);
    expect(result[0].posY).toBe(2);
    expect(result[0].width).toBe(2);
    expect(result[0].height).toBe(1);
  });

  it("keeps distinct posX 0..n-1 even when a tile spans the entire grid (no collapse)", () => {
    const tiles: GridTile[] = [
      tile({ id: "hero", width: 8, height: 4 }),
      tile({ id: "b", posX: 4 }),
      tile({ id: "c", posX: 2 }),
    ];
    const result = renumberOrder(tiles);
    expect(result.map((t) => t.id)).toEqual(["hero", "b", "c"]);
    expect(result.map((t) => t.posX)).toEqual([0, 1, 2]);
  });

  it("posX follows the given array order regardless of previous positions", () => {
    const tiles: GridTile[] = [
      tile({ id: "c", posX: 7 }),
      tile({ id: "a", posX: 0 }),
      tile({ id: "b", posX: 2 }),
    ];
    const result = renumberOrder(tiles);
    expect(result.map((t) => t.id)).toEqual(["c", "a", "b"]);
    expect(result.map((t) => t.posX)).toEqual([0, 1, 2]);
  });
});

describe("autoSuggestPosition", () => {
  it("returns (0,0) on an empty grid", () => {
    expect(autoSuggestPosition(grid, [])).toEqual({ x: 0, y: 0 });
  });

  it("finds the first free cell in row-major order", () => {
    const tiles: GridTile[] = [
      tile({ id: "a", posX: 0, posY: 0 }),
      tile({ id: "b", posX: 1, posY: 0 }),
      tile({ id: "c", posX: 2, posY: 0 }),
    ];
    expect(autoSuggestPosition(grid, tiles)).toEqual({ x: 3, y: 0 });
  });

  it("skips cells occupied by multi-cell tiles", () => {
    const tiles: GridTile[] = [
      tile({ id: "a", posX: 0, posY: 0, width: 2, height: 1 }),
    ];
    expect(autoSuggestPosition(grid, tiles)).toEqual({ x: 2, y: 0 });
  });

  it("places a new tile inside a full-grid tile, not at its top-left corner (hero-home)", () => {
    // Single full-grid tile (seeded hero-home 8×4): fallback lands on the last
    // row-major cell, inside the big tile but away from the origin.
    const tiles: GridTile[] = [tile({ id: "hero", width: 8, height: 4 })];
    expect(autoSuggestPosition(grid, tiles)).toEqual({ x: 7, y: 3 });
  });

  it("returns the last row-major cell when single-cell tiles fill the grid", () => {
    const tiles: GridTile[] = Array.from({ length: grid.cols * grid.rows }, (_, i) =>
      tile({ id: `t${i}`, posX: i % grid.cols, posY: Math.floor(i / grid.cols) })
    );
    expect(autoSuggestPosition(grid, tiles)).toEqual({ x: 7, y: 3 });
  });

  it("returns the last row-major cell when multi-cell tiles cover the whole grid", () => {
    const tiles: GridTile[] = [
      tile({ id: "a", posX: 0, posY: 0, width: 4, height: 2 }),
      tile({ id: "b", posX: 4, posY: 0, width: 4, height: 2 }),
    ];
    expect(autoSuggestPosition({ cols: 8, rows: 2 }, tiles)).toEqual({ x: 7, y: 1 });
  });

  it("returns (0,0) on a degenerate grid with zero columns", () => {
    expect(autoSuggestPosition({ cols: 0, rows: 4 }, [])).toEqual({ x: 0, y: 0 });
  });
});

describe("tilePlacement", () => {
  it("maps 0-based posX/posY to 1-based CSS grid coords", () => {
    expect(tilePlacement(tile({ posX: 2, posY: 3 }))).toEqual({ col: 3, row: 4 });
  });

  it("maps the origin to col 1 row 1", () => {
    expect(tilePlacement(tile())).toEqual({ col: 1, row: 1 });
  });
});

describe("resizeToSpans all handle types", () => {
  const handles: ResizeHandle[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
  const anyBase = tile({ posX: 1, posY: 1, width: 2, height: 2 });
  it("accepts every handle without throwing and keeps spans >= 1", () => {
    for (const handle of handles) {
      const result = resizeToSpans(anyBase, { x: 4, y: 3 }, handle, grid);
      expect(result.width).toBeGreaterThanOrEqual(1);
      expect(result.height).toBeGreaterThanOrEqual(1);
      expect(result.width).toBeLessThanOrEqual(grid.cols);
      expect(result.height).toBeLessThanOrEqual(grid.rows);
    }
  });
});
