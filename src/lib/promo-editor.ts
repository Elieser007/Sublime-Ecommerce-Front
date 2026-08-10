import { clampTile, autoSuggestPosition, type Grid } from "./promo-grid";
import { getProductImageUrl } from "./public-api";

export interface EditorPromotion {
  id: string | null;
  localId: string | null;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  localImageUrl: string | null;
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
  removedDraftUrls: string[];
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
  imageUrl: string | null;
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
  section: SavedSectionResponse | null;
  promotions: ServerPromotion[];
}

let localIdSeq = 0;

export function nextLocalId(): string {
  localIdSeq += 1;
  return `local-${localIdSeq}`;
}

export function localKey(p: Pick<EditorPromotion, "id" | "localId">): string {
  return p.id || p.localId || "";
}

export interface StripItemBox {
  top: number;
  bottom: number;
}

export function stripHoverIndex(items: StripItemBox[], pointerY: number): number {
  if (items.length === 0) return -1;
  let nearest = 0;
  let best = Infinity;
  for (let i = 0; i < items.length; i++) {
    const midpoint = (items[i].top + items[i].bottom) / 2;
    const distance = Math.abs(midpoint - pointerY);
    if (distance < best) {
      best = distance;
      nearest = i;
    }
  }
  return nearest;
}

export function isPromoEditorRoute(pathname: string): boolean {
  return pathname.startsWith("/admin/promotions");
}

export function setLocalImage(
  promo: EditorPromotion,
  objectUrl: string
): EditorPromotion {
  return { ...promo, localImageUrl: objectUrl };
}

export function clearLocalImage(promo: EditorPromotion): EditorPromotion {
  return { ...promo, localImageUrl: null };
}

export function orphanedDraftUrls(
  before: Array<{ localImageUrl?: string | null }>,
  after: Array<{ localImageUrl?: string | null }>,
  history: EditorHistory = { past: [], future: [] }
): string[] {
  const live = new Set<string>();
  for (const p of after) {
    if (p.localImageUrl) live.add(p.localImageUrl);
  }
  for (const snap of [...history.past, ...history.future]) {
    for (const p of snap.promotions) {
      if (p.localImageUrl) live.add(p.localImageUrl);
    }
  }
  const orphaned = new Set<string>();
  for (const p of before) {
    if (p.localImageUrl && !live.has(p.localImageUrl)) orphaned.add(p.localImageUrl);
  }
  return [...orphaned];
}

export function draftUrlReferenced(
  url: string,
  after: Array<{ localImageUrl?: string | null }>,
  history: EditorHistory = { past: [], future: [] },
  pending: PromoEditorState[] = []
): boolean {
  if (after.some((p) => p.localImageUrl === url)) return true;
  for (const snap of [...history.past, ...history.future, ...pending]) {
    if (snap.promotions.some((p) => p.localImageUrl === url)) return true;
  }
  return false;
}

export function historyDraftUrls(history: EditorHistory): string[] {
  const urls = new Set<string>();
  for (const snap of [...history.past, ...history.future]) {
    for (const p of snap.promotions) {
      if (p.localImageUrl) urls.add(p.localImageUrl);
    }
  }
  return [...urls];
}

export function revokeDraftUrlsOnce(
  urls: Iterable<string>,
  liveAfter: Array<{ localImageUrl?: string | null }>,
  revoke: (url: string) => void = (url) => URL.revokeObjectURL(url)
): void {
  const live = new Set<string>();
  for (const p of liveAfter) {
    if (p.localImageUrl) live.add(p.localImageUrl);
  }
  const revoked = new Set<string>();
  for (const url of urls) {
    if (revoked.has(url) || live.has(url)) continue;
    revoked.add(url);
    revoke(url);
  }
}

export function resolvePromoImage(promo: {
  localImageUrl?: string | null;
  imageUrl?: string | null;
}): string {
  return promo.localImageUrl || getProductImageUrl(promo.imageUrl);
}

function toEditorPromotion(p: ServerPromotion): EditorPromotion {
  return {
    id: p.id,
    localId: null,
    title: p.title || "",
    subtitle: p.subtitle,
    imageUrl: p.imageUrl,
    localImageUrl: null,
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
    removedDraftUrls: [],
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
    removedDraftUrls: [...s.removedDraftUrls],
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
    localImageUrl: p.localImageUrl,
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

export function survivingImageReferences(
  promotions: EditorPromotion[],
  resolvedUrls: Record<string, string | null> = {}
): Set<string> {
  // Post-save URLs only: previousImageUrl is the URL being replaced, never a survivor.
  const refs = new Set<string>();
  for (const p of promotions) {
    const resolved = p.id ? resolvedUrls[p.id] : undefined;
    const url = resolved !== undefined ? resolved : p.imageUrl;
    if (url) refs.add(url);
  }
  return refs;
}

export function applySavedResponse(
  s: PromoEditorState,
  res: SavedPromotionsResponse
): PromoEditorState {
  const section = res.section
    ? {
        id: res.section.id,
        name: res.section.name,
        slug: res.section.slug,
        gridCols: res.section.gridCols,
        gridRows: res.section.gridRows,
        displayType: res.section.displayType,
      }
    : { ...s.section };
  return {
    section,
    promotions: res.promotions.map(toEditorPromotion),
    deletedIds: [],
    deletedImageUrls: [],
    removedDraftUrls: [],
  };
}

export function validatePromotionsForSave(promotions: EditorPromotion[]): string | null {
  const blank = promotions.find((p) => !p.title.trim());
  if (!blank) return null;
  const name = blank.title.trim() || "(sin título)";
  return `El anuncio "${name}" (celda ${blank.posX + 1},${blank.posY + 1}) necesita un título`;
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

export function removePromotion(s: PromoEditorState, key: string): PromoEditorState {
  const promo = s.promotions.find((p) => localKey(p) === key);
  const deletedIds = promo?.id ? [...s.deletedIds, promo.id] : s.deletedIds;
  const deletedImageUrls = promo ? [...s.deletedImageUrls] : s.deletedImageUrls;
  if (promo?.imageUrl && !promo.previousImageUrl) deletedImageUrls.push(promo.imageUrl);
  if (promo?.previousImageUrl && promo.previousImageUrl !== promo.imageUrl) {
    deletedImageUrls.push(promo.previousImageUrl);
  }
  const removedDraftUrls = promo?.localImageUrl
    ? [...s.removedDraftUrls, promo.localImageUrl]
    : s.removedDraftUrls;
  return {
    ...s,
    promotions: s.promotions.filter((p) => localKey(p) !== key),
    deletedIds,
    deletedImageUrls,
    removedDraftUrls,
  };
}

export function duplicatePromotion(s: PromoEditorState, id: string): PromoEditorState {
  const source = s.promotions.find((p) => localKey(p) === id);
  if (!source) return s;

  const grid: Grid = { cols: s.section.gridCols, rows: s.section.gridRows };
  const suggested = autoSuggestPosition(grid, s.promotions);

  const copy: EditorPromotion = {
    ...source,
    id: null,
    localId: nextLocalId(),
    posX: suggested.x,
    posY: suggested.y,
    imageBlob: source.imageBlob,
    imageId: null,
    previousImageUrl: null,
  };
  return { ...s, promotions: [...s.promotions, copy] };
}

export function updatePromotion(
  s: PromoEditorState,
  key: string,
  patch: Partial<Omit<EditorPromotion, "id">>
): PromoEditorState {
  return {
    ...s,
    promotions: s.promotions.map((p) =>
      localKey(p) === key ? { ...p, ...patch } : p
    ),
  };
}

export function addPromotion(
  s: PromoEditorState,
  fields: Partial<Omit<EditorPromotion, "id" | "posX" | "posY">> = {}
): PromoEditorState {
  const grid: Grid = { cols: s.section.gridCols, rows: s.section.gridRows };
  const suggested = autoSuggestPosition(grid, s.promotions);
  const placed = clampTile(
    {
      id: "",
      posX: suggested.x,
      posY: suggested.y,
      width: fields.width ?? 1,
      height: fields.height ?? 1,
    },
    grid
  );

  const promo: EditorPromotion = {
    id: null,
    localId: nextLocalId(),
    title: fields.title ?? "",
    subtitle: fields.subtitle ?? null,
    imageUrl: fields.imageUrl ?? null,
    localImageUrl: fields.localImageUrl ?? null,
    link: fields.link ?? "",
    posX: placed.posX,
    posY: placed.posY,
    width: placed.width,
    height: placed.height,
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
      localKey(p) === id
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
