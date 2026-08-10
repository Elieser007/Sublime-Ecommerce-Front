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

export function dragToCell(
  tile: GridTile,
  cell: { x: number; y: number },
  grid: Grid
): GridTile {
  return clampTile({ ...tile, posX: cell.x, posY: cell.y }, grid);
}

function tileEdges(tile: GridTile) {
  return {
    left: tile.posX,
    top: tile.posY,
    right: tile.posX + tile.width - 1,
    bottom: tile.posY + tile.height - 1,
  };
}

function anchorEdges(tile: GridTile, handle: ResizeHandle) {
  const { left, top, right, bottom } = tileEdges(tile);
  return {
    left: handle.includes("w") ? undefined : left,
    top: handle.includes("n") ? undefined : top,
    right: handle.includes("e") ? undefined : right,
    bottom: handle.includes("s") ? undefined : bottom,
  };
}

export function resizeToSpans(
  tile: GridTile,
  cell: { x: number; y: number },
  handle: ResizeHandle,
  grid: Grid
): GridTile {
  const anchor = anchorEdges(tile, handle);

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

export function detectCollisions(tiles: GridTile[], movedId: string): string[] {
  const moved = tiles.find((t) => t.id === movedId);
  if (!moved) return [];

  const { left: ml, top: mt, right: mr, bottom: mb } = tileEdges(moved);

  return tiles
    .filter((t) => t.id !== movedId)
    .filter((t) => {
      const { left, top, right, bottom } = tileEdges(t);
      const overlapsX = ml <= right && left <= mr;
      const overlapsY = mt <= bottom && top <= mb;
      return overlapsX && overlapsY;
    })
    .map((t) => t.id);
}

export function renumberOrder(tiles: GridTile[]): GridTile[] {
  return tiles.map((t, i) => ({ ...t, posX: i }));
}

export function autoSuggestPosition(
  grid: Grid,
  tiles: GridTile[]
): { x: number; y: number } {
  const isFullyCovered = (x: number, y: number) =>
    tiles.some(
      (t) =>
        x >= t.posX && x < t.posX + t.width && y >= t.posY && y < t.posY + t.height
    );

  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      if (!isFullyCovered(x, y)) return { x, y };
    }
  }

  if (grid.cols <= 0 || grid.rows <= 0) return { x: 0, y: 0 };
  return { x: grid.cols - 1, y: grid.rows - 1 };
}

export function tilePlacement(tile: GridTile): { col: number; row: number } {
  return { col: tile.posX + 1, row: tile.posY + 1 };
}
