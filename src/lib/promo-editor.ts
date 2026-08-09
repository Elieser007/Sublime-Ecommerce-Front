import { clampTile, autoSuggestPosition, type Grid } from "./promo-grid";

export interface EditorPromotion {
  id: string | null;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  link: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  isActive: boolean;
  imageId: string | null;
  imageBlob: Blob | null;
  previousImageUrl: string | null;
}

export interface EditorSection {
  id: string;
  name: string;
  slug: string;
  gridCols: number;
  gridRows: number;
  displayType: string;
}

export interface PromoEditorState {
  section: EditorSection;
  promotions: EditorPromotion[];
  deletedIds: string[];
  deletedImageUrls: string[];
}

export interface EditorHistory {
  past: PromoEditorState[];
  future: PromoEditorState[];
}

export const HISTORY_LIMIT = 50;

export interface ServerPromotion {
  id: string;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  link: string | null;
  position: number;
  posY?: number;
  tileCols: number;
  tileRows: number;
}

export interface SavedSectionResponse {
  id: string;
  name: string;
  slug: string;
  gridCols: number;
  gridRows: number;
  displayType: string;
}

export interface SavedPromotionsResponse {
  section: SavedSectionResponse;
  promotions: ServerPromotion[];
}

function toEditorPromotion(p: ServerPromotion): EditorPromotion {
  return {
    id: p.id,
    title: p.title || "",
    subtitle: p.subtitle,
    imageUrl: p.imageUrl,
    link: p.link || "/",
    posX: p.position,
    posY: p.posY ?? 0,
    width: p.tileCols,
    height: p.tileRows,
    isActive: true,
    imageId: null,
    imageBlob: null,
    previousImageUrl: null,
  };
}

export function createEditorState(
  section: EditorSection,
  promotions: ServerPromotion[]
): PromoEditorState {
  return {
    section: { ...section },
    promotions: promotions.map(toEditorPromotion),
    deletedIds: [],
    deletedImageUrls: [],
  };
}

export function createSnapshot(s: PromoEditorState): PromoEditorState {
  return {
    section: { ...s.section },
    promotions: s.promotions.map((p) => ({
      ...p,
      imageBlob: p.imageBlob,
    })),
    deletedIds: [...s.deletedIds],
    deletedImageUrls: [...s.deletedImageUrls],
  };
}

function project(p: EditorPromotion): Record<string, unknown> {
  return {
    id: p.id,
    title: p.title,
    subtitle: p.subtitle,
    imageUrl: p.imageUrl,
    link: p.link,
    posX: p.posX,
    posY: p.posY,
    width: p.width,
    height: p.height,
    isActive: p.isActive,
    imageBlob: p.imageBlob ? "<blob>" : null,
  };
}

export function isDirty(s: PromoEditorState, snap: PromoEditorState): boolean {
  const a = {
    section: s.section,
    promotions: s.promotions.map(project),
    deletedIds: s.deletedIds,
  };
  const b = {
    section: snap.section,
    promotions: snap.promotions.map(project),
    deletedIds: snap.deletedIds,
  };
  return JSON.stringify(a) !== JSON.stringify(b);
}

export function revert(s: PromoEditorState, snap: PromoEditorState): PromoEditorState {
  return createSnapshot(snap);
}

export function toSavePayload(
  s: PromoEditorState,
  resolvedUrls: Record<string, string | null> = {}
): {
  gridCols: number;
  gridRows: number;
  displayType: string;
  promotions: Array<{
    id?: string;
    title: string;
    subtitle: string | null;
    imageUrl: string | null;
    link: string;
    posX: number;
    posY: number;
    width: number;
    height: number;
    isActive: boolean;
  }>;
  deletePromotionIds: string[];
} {
  return {
    gridCols: s.section.gridCols,
    gridRows: s.section.gridRows,
    displayType: s.section.displayType,
    promotions: s.promotions.map((p) => {
      const item: {
        id?: string;
        title: string;
        subtitle: string | null;
        imageUrl: string | null;
        link: string;
        posX: number;
        posY: number;
        width: number;
        height: number;
        isActive: boolean;
      } = {
        title: p.title,
        subtitle: p.subtitle,
        imageUrl: p.imageUrl,
        link: p.link || "/",
        posX: p.posX,
        posY: p.posY,
        width: p.width,
        height: p.height,
        isActive: p.isActive,
      };
      if (p.id) item.id = p.id;
      if (p.id && resolvedUrls[p.id] !== undefined) item.imageUrl = resolvedUrls[p.id];
      return item;
    }),
    deletePromotionIds: [...s.deletedIds],
  };
}

export function applySavedResponse(
  s: PromoEditorState,
  res: SavedPromotionsResponse
): PromoEditorState {
  return {
    section: {
      id: res.section.id,
      name: res.section.name,
      slug: res.section.slug,
      gridCols: res.section.gridCols,
      gridRows: res.section.gridRows,
      displayType: res.section.displayType,
    },
    promotions: res.promotions.map(toEditorPromotion),
    deletedIds: [],
    deletedImageUrls: [],
  };
}

export function movePromotion(s: PromoEditorState, from: number, to: number): PromoEditorState {
  if (from < 0 || from >= s.promotions.length || to < 0 || to >= s.promotions.length) {
    return s;
  }
  const promotions = [...s.promotions];
  const [moved] = promotions.splice(from, 1);
  promotions.splice(to, 0, moved);
  return { ...s, promotions };
}

export function removePromotion(s: PromoEditorState, id: string): PromoEditorState {
  const promo = s.promotions.find((p) => p.id === id);
  const deletedIds = promo?.id ? [...s.deletedIds, promo.id] : s.deletedIds;
  const deletedImageUrls =
    promo?.imageUrl && !promo.previousImageUrl
      ? [...s.deletedImageUrls, promo.imageUrl]
      : s.deletedImageUrls;
  return {
    ...s,
    promotions: s.promotions.filter((p) => p.id !== id),
    deletedIds,
    deletedImageUrls,
  };
}

export function duplicatePromotion(s: PromoEditorState, id: string): PromoEditorState {
  const source = s.promotions.find((p) => p.id === id);
  if (!source) return s;

  const grid: Grid = { cols: s.section.gridCols, rows: s.section.gridRows };
  const suggested = autoSuggestPosition(grid, s.promotions);
  if (!suggested) return s;

  const copy: EditorPromotion = {
    ...source,
    id: null,
    posX: suggested.x,
    posY: suggested.y,
    imageBlob: null,
    imageId: null,
    previousImageUrl: null,
  };
  return { ...s, promotions: [...s.promotions, copy] };
}

export function updatePromotion(
  s: PromoEditorState,
  id: string,
  patch: Partial<Omit<EditorPromotion, "id">>
): PromoEditorState {
  return {
    ...s,
    promotions: s.promotions.map((p) =>
      p.id === id ? { ...p, ...patch } : p
    ),
  };
}

export function addPromotion(
  s: PromoEditorState,
  fields: Partial<Omit<EditorPromotion, "id" | "posX" | "posY">> = {}
): PromoEditorState {
  const grid: Grid = { cols: s.section.gridCols, rows: s.section.gridRows };
  const suggested = autoSuggestPosition(grid, s.promotions);
  if (!suggested) return s;

  const promo: EditorPromotion = {
    id: null,
    title: fields.title ?? "",
    subtitle: fields.subtitle ?? null,
    imageUrl: fields.imageUrl ?? null,
    link: fields.link ?? "",
    posX: suggested.x,
    posY: suggested.y,
    width: fields.width ?? 1,
    height: fields.height ?? 1,
    isActive: fields.isActive ?? true,
    imageId: null,
    imageBlob: fields.imageBlob ?? null,
    previousImageUrl: null,
  };
  return { ...s, promotions: [...s.promotions, promo] };
}

export function setSection(
  s: PromoEditorState,
  patch: Partial<Omit<EditorSection, "id">>
): PromoEditorState {
  return { ...s, section: { ...s.section, ...patch } };
}

export function clampPromotionTile(s: PromoEditorState, id: string): PromoEditorState {
  const grid: Grid = { cols: s.section.gridCols, rows: s.section.gridRows };
  return {
    ...s,
    promotions: s.promotions.map((p) =>
      p.id === id
        ? {
            ...p,
            ...clampTile(
              { id: p.id!, posX: p.posX, posY: p.posY, width: p.width, height: p.height },
              grid
            ),
          }
        : p
    ),
  };
}

export function createHistory(): EditorHistory {
  return { past: [], future: [] };
}

export function pushHistory(h: EditorHistory, s: PromoEditorState): EditorHistory {
  const past = [...h.past, createSnapshot(s)].slice(-HISTORY_LIMIT);
  return { past, future: [] };
}

export function undoEditor(
  h: EditorHistory,
  s: PromoEditorState
): { state: PromoEditorState; history: EditorHistory } | null {
  if (h.past.length === 0) return null;
  const past = h.past.slice(0, -1);
  const current = createSnapshot(s);
  return {
    state: createSnapshot(h.past[h.past.length - 1]),
    history: { past, future: [...h.future, current] },
  };
}

export function redoEditor(
  h: EditorHistory,
  s: PromoEditorState
): { state: PromoEditorState; history: EditorHistory } | null {
  if (h.future.length === 0) return null;
  const future = h.future.slice(1);
  const current = createSnapshot(s);
  return {
    state: createSnapshot(h.future[0]),
    history: { past: [...h.past, current], future },
  };
}

export function shouldWarnBeforeUnload(s: PromoEditorState, snap: PromoEditorState): boolean {
  return isDirty(s, snap);
}

export function extractFilename(url: string): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const isBucketDomain = parsed.hostname === "media.sublimepy.store";
  const isUploadProxy = parsed.pathname.startsWith("/api/upload/");
  if (!isBucketDomain && !isUploadProxy) return null;

  const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
  return lastSegment ? decodeURIComponent(lastSegment) : null;
}
