/**
 * Promo Grid — pure grid math for the visual promo editor.
 *
 * All geometry is in INTEGER cell units (design AD "Coordinate rounding"):
 * the page converts px → cells via clientToCell (Math.floor) and every
 * function here operates on cells only. No DOM access, no side effects.
 *
 * Handles are named by compass direction; resizeToSpans anchors the
 * OPPOSITE corner and moves the edge(s) named by the handle. A tile's
 * occupied cells are posX..posX+width-1 and posY..posY+height-1 (inclusive).
 */

export interface GridTile {
  id: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
}

export interface Grid {
  cols: number;
  rows: number;
}

export type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/**
 * Clamp a tile to the grid: spans to [1, cols]/[1, rows], then position so
 * the tile stays fully inside (posX ∈ [0, cols-w], posY ∈ [0, rows-h]).
 */
export function clampTile(tile: GridTile, grid: Grid): GridTile {
  const width = clamp(tile.width, 1, grid.cols);
  const height = clamp(tile.height, 1, grid.rows);
  return {
    ...tile,
    width,
    height,
    posX: clamp(tile.posX, 0, grid.cols - width),
    posY: clamp(tile.posY, 0, grid.rows - height),
  };
}

/**
 * Move the tile so its TOP-LEFT corner is at `cell` (the pointer cell).
 * The page subtracts the grab offset (px→cells) before calling this, so the
 * target is always the intended top-left. Clamped to stay in bounds.
 */
export function dragToCell(
  tile: GridTile,
  cell: { x: number; y: number },
  grid: Grid
): GridTile {
  return clampTile({ ...tile, posX: cell.x, posY: cell.y }, grid);
}

/** Inclusive cell ranges of the tile (0-based cells actually covered). */
function tileEdges(tile: GridTile) {
  return {
    left: tile.posX,
    top: tile.posY,
    right: tile.posX + tile.width - 1,
    bottom: tile.posY + tile.height - 1,
  };
}

/** Opposite corner of the tile from the given handle (the anchored corner). */
function anchorEdges(tile: GridTile, handle: ResizeHandle) {
  const { left, top, right, bottom } = tileEdges(tile);
  // The anchored edges are the ones NOT named by the handle.
  return {
    left: handle.includes("w") ? undefined : left,
    top: handle.includes("n") ? undefined : top,
    right: handle.includes("e") ? undefined : right,
    bottom: handle.includes("s") ? undefined : bottom,
  };
}

/**
 * Resize the tile by dragging the given handle to `cell`. The opposite
 * corner stays anchored; the dragged edges move to the pointer cell.
 * Spans are clamped to ≥1 and the result clamped to the grid.
 */
export function resizeToSpans(
  tile: GridTile,
  cell: { x: number; y: number },
  handle: ResizeHandle,
  grid: Grid
): GridTile {
  const anchor = anchorEdges(tile, handle);

  // New edges: anchored edges stay, dragged edges go to the pointer cell.
  const left = anchor.left !== undefined ? anchor.left : Math.min(cell.x, tile.posX + tile.width - 1);
  const right = anchor.right !== undefined ? anchor.right : Math.max(cell.x, tile.posX);
  const top = anchor.top !== undefined ? anchor.top : Math.min(cell.y, tile.posY + tile.height - 1);
  const bottom = anchor.bottom !== undefined ? anchor.bottom : Math.max(cell.y, tile.posY);

  return clampTile(
    {
      ...tile,
      posX: left,
      posY: top,
      width: right - left + 1,
      height: bottom - top + 1,
    },
    grid
  );
}

/**
 * Detect tiles that collide with the moved tile (including edge-touch —
 * "touch/overlap" per the spec). The moved tile itself is excluded by id.
 * WARN-ONLY: never blocks a placement.
 */
export function detectCollisions(tiles: GridTile[], movedId: string): string[] {
  const moved = tiles.find((t) => t.id === movedId);
  if (!moved) return [];

  const { left: ml, top: mt, right: mr, bottom: mb } = tileEdges(moved);

  return tiles
    .filter((t) => t.id !== movedId)
    .filter((t) => {
      const { left, top, right, bottom } = tileEdges(t);
      // Cells are discrete; separation requires at least one EMPTY cell
      // between the tiles. Adjacent edges (touch) count as a collision.
      const separatedX = mr + 1 < left || right + 1 < ml;
      const separatedY = mb + 1 < top || bottom + 1 < mt;
      return !separatedX && !separatedY;
    })
    .map((t) => t.id);
}

/**
 * Renumber posX to the array index (0..n-1) — used for carousel/split/ribbon
 * where array order IS the display order. Other fields untouched.
 */
export function renumberOrder(tiles: GridTile[]): GridTile[] {
  return tiles.map((t, i) => ({ ...t, posX: i }));
}

/**
 * First free cell in row-major order, or null when the grid is full.
 * Occupied = any cell covered by an existing tile.
 */
export function autoSuggestPosition(
  grid: Grid,
  tiles: GridTile[]
): { x: number; y: number } | null {
  const occupied = new Set<string>();
  for (const t of tiles) {
    for (let y = t.posY; y < t.posY + t.height; y++) {
      for (let x = t.posX; x < t.posX + t.width; x++) {
        occupied.add(`${x},${y}`);
      }
    }
  }

  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      if (!occupied.has(`${x},${y}`)) return { x, y };
    }
  }
  return null;
}

/** 1-based CSS grid coordinates for a tile (grid-column/row placement). */
export function tilePlacement(tile: GridTile): { col: number; row: number } {
  return { col: tile.posX + 1, row: tile.posY + 1 };
}
