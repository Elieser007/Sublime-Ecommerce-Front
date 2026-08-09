/**
 * Promo Canvas — pure renderer + geometry for the visual promo editor.
 *
 * Renders the tile canvas as HTML STRINGS positioned in percentages of the
 * canvas (one renderer covers desktop and mobile — the cell size only sets
 * canvas width), builds the grid-lines overlay, and converts px → cells.
 * NO event binding: the page owns the pointer-event session and calls only
 * these pure functions (design AD "Pointer machine location").
 */

import { escapeHtml } from "./escape-html";
import type { Grid, GridTile, ResizeHandle } from "./promo-grid";

export const MIN_CELL = 72;
export const MAX_CELL = 120;
export const MOBILE_CELL = 80;

/**
 * Convert a pointer position (relative to the canvas) to integer cell
 * coordinates, clamped to the grid. Math.floor: a pointer snaps to the next
 * cell only once it passes the cell origin (design AD "Coordinate rounding").
 */
export function clientToCell(
  clientX: number,
  clientY: number,
  cellSize: number,
  grid: Grid
): { x: number; y: number } {
  const safeCell = cellSize > 0 ? cellSize : 1;
  const x = Math.floor(clientX / safeCell);
  const y = Math.floor(clientY / safeCell);
  return {
    x: Math.min(Math.max(x, 0), grid.cols - 1),
    y: Math.min(Math.max(y, 0), grid.rows - 1),
  };
}

/**
 * Desktop (>=768px): cells fill the width, clamped to 72–120px. Mobile:
 * fixed 80px cells with horizontal scroll (AR-2 — never shrink tiles below
 * usable size on 375px).
 */
export function cellSizeForGrid(grid: Grid, containerWidth: number, desktop: boolean): number {
  if (!desktop) return MOBILE_CELL;
  if (!grid.cols || grid.cols <= 0) return MOBILE_CELL;
  const perCell = Math.floor(containerWidth / grid.cols);
  return Math.min(MAX_CELL, Math.max(MIN_CELL, perCell));
}

/** Canvas pixel size for the grid at the resolved cell size. */
export function canvasSizeForGrid(grid: Grid, cellSize: number): { width: number; height: number } {
  return {
    width: grid.cols * cellSize,
    height: grid.rows * cellSize,
  };
}

function percent(n: number, total: number): string {
  if (total <= 0) return "0%";
  const pct = (n / total) * 100;
  // Keep 3 decimals max so the string is compact and precise enough.
  return `${Number(pct.toFixed(3))}%`;
}

/** Grid-lines overlay: one vertical line per col boundary (0..cols) + same for rows. */
export function renderGridLines(grid: Grid, cellSize: number): string {
  let html = '<div class="grid-lines" aria-hidden="true">';
  for (let x = 0; x <= grid.cols; x++) {
    html += `<i class="gl-v" style="left:${x * cellSize}px"></i>`;
  }
  for (let y = 0; y <= grid.rows; y++) {
    html += `<i class="gl-h" style="top:${y * cellSize}px"></i>`;
  }
  html += "</div>";
  return html;
}

const HANDLES: ResizeHandle[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

/**
 * Render the tile canvas HTML. Tiles are absolutely positioned in PERCENT
 * of the canvas (left: posX/cols*100%), so one renderer works at any cell
 * size — desktop fluid or mobile 80px scroll. Each tile carries 8 resize
 * handles with a ≥44px hit target class (AR-2).
 */
export function renderTileCanvasHtml(
  tiles: Array<GridTile & { title?: string }>,
  grid: Grid
): string {
  if (tiles.length === 0) return "";
  const cols = grid.cols > 0 ? grid.cols : 1;
  const rows = grid.rows > 0 ? grid.rows : 1;

  return tiles
    .map((t) => {
      const left = percent(t.posX, cols);
      const top = percent(t.posY, rows);
      const width = percent(t.width, cols);
      const height = percent(t.height, rows);
      const title = escapeHtml(t.title ?? "");
      return `<div class="canvas-tile" data-id="${escapeHtml(t.id)}" style="left:${left};top:${top};width:${width};height:${height};" role="button" tabindex="0" aria-label="${title || "Tile"}"><span class="tile-title">${title}</span>${HANDLES.map(
        (h) => `<span class="resize-handle resize-handle--${h} handle-hit" data-handle="${h}"></span>`
      ).join("")}</div>`;
    })
    .join("");
}
