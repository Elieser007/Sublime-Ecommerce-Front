import { escapeHtml } from "./escape-html";
import type { Grid, GridTile, ResizeHandle } from "./promo-grid";
import { renderPromoTileContent } from "./promo-tile";

export interface CanvasTile extends GridTile {
  title?: string | null;
  subtitle?: string | null;
  imageUrl?: string | null;
  localImageUrl?: string | null;
  link?: string;
}

export const MIN_CELL = 72;
export const MAX_CELL = 120;
export const MOBILE_CELL = 80;

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

export function cellSizeForGrid(grid: Grid, containerWidth: number, desktop: boolean): number {
  if (!desktop) return MOBILE_CELL;
  if (!grid.cols || grid.cols <= 0) return MOBILE_CELL;
  const perCell = Math.floor(containerWidth / grid.cols);
  return Math.min(MAX_CELL, Math.max(MIN_CELL, perCell));
}

export function canvasSizeForGrid(grid: Grid, cellSize: number): { width: number; height: number } {
  return {
    width: grid.cols * cellSize,
    height: grid.rows * cellSize,
  };
}

function percent(n: number, total: number): string {
  if (total <= 0) return "0%";
  const pct = (n / total) * 100;
  return `${Number(pct.toFixed(3))}%`;
}

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

const EDIT_AFFORDANCE =
  '<span class="tile-edit" role="button" tabindex="0" data-action="edit" aria-label="Editar tile">✎</span>';

export function renderTileCanvasHtml(
  tiles: CanvasTile[],
  grid: Grid,
  selectedId?: string | null
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
      const selected = selectedId != null && t.id === selectedId;
      const title = escapeHtml(t.title ?? "");
      const handles =
        selectedId == null || selected
          ? HANDLES.map(
              (h) => `<span class="resize-handle resize-handle--${h} handle-hit" data-handle="${h}"></span>`
            ).join("")
          : "";
      return `<div class="canvas-tile${selected ? " selected" : ""}" data-id="${escapeHtml(t.id)}" style="left:${left};top:${top};width:${width};height:${height};" role="button" tabindex="0" aria-label="${title || "Tile"}">${renderPromoTileContent(t, { inertLink: true })}${selected ? EDIT_AFFORDANCE : ""}${handles}</div>`;
    })
    .join("");
}
