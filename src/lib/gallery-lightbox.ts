/**
 * Gallery lightbox math — pure zoom/pan/navigation functions.
 *
 * Locks the lightbox conventions (REQ-10..16): scale clamp [1, 6],
 * cursor-anchored zoom, pan clamp ±(dim·(scale−1))/2, wheel factor 1.15,
 * +/− step 1.25, double-click 2.5. All functions are pure: inputs are
 * never mutated, new state objects are returned.
 */

export interface ZoomState {
  scale: number;
  tx: number;
  ty: number;
}

export const MIN_SCALE = 1; // clamp floor
export const MAX_SCALE = 6; // clamp ceiling
export const ZOOM_STEP = 1.25; // +/− buttons and keyboard
export const DBLCLICK_ZOOM = 2.5; // dblclick target
export const WHEEL_FACTOR = 1.15; // wheel/pinch step

/** Fresh fit state — callers must treat the result as immutable. */
export function resetZoom(): ZoomState {
  return { scale: MIN_SCALE, tx: 0, ty: 0 };
}

/** Clamps scale to [MIN_SCALE, MAX_SCALE]. */
export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Clamps translation so the image edges never leave the stage. */
export function clampPan(s: ZoomState, w: number, h: number): ZoomState {
  const maxX = Math.max(0, (w * (s.scale - 1)) / 2);
  const maxY = Math.max(0, (h * (s.scale - 1)) / 2);
  const tx = Math.min(maxX, Math.max(-maxX, s.tx));
  const ty = Math.min(maxY, Math.max(-maxY, s.ty));
  // Canonicalize negative zero so fit state is always exactly (0, 0).
  return { ...s, tx: tx === 0 ? 0 : tx, ty: ty === 0 ? 0 : ty };
}

/** Zooms by factor keeping the stage point (cx, cy) fixed under the cursor. */
export function zoomAt(s: ZoomState, cx: number, cy: number, factor: number, w: number, h: number): ZoomState {
  const next = clampScale(s.scale * factor);
  const k = next / s.scale;
  const tx = cx - (cx - s.tx) * k;
  const ty = cy - (cy - s.ty) * k;
  return clampPan({ scale: next, tx, ty }, w, h);
}

/** Zooms by factor centered on the stage. */
export function zoomBy(s: ZoomState, factor: number, w: number, h: number): ZoomState {
  return zoomAt(s, w / 2, h / 2, factor, w, h);
}

/** Double-click toggle: fit ↔ 2.5× at the pointer. */
export function toggleZoomAt(s: ZoomState, cx: number, cy: number, w: number, h: number): ZoomState {
  if (s.scale > MIN_SCALE) return resetZoom();
  return zoomAt(s, cx, cy, DBLCLICK_ZOOM, w, h);
}

/** Pinch zoom: scale by the finger-distance ratio, clamped. */
export function pinchScale(startScale: number, startDist: number, dist: number): number {
  if (startDist <= 0) return clampScale(startScale);
  return clampScale(startScale * (dist / startDist));
}

/** Drag pan to an absolute translation, clamped to the stage bounds. */
export function panTo(s: ZoomState, tx: number, ty: number, w: number, h: number): ZoomState {
  return clampPan({ ...s, tx, ty }, w, h);
}

/**
 * Wheel zoom direction (locked convention): plain deltaY > 0 and trackpad
 * pinch (ctrlKey, deltaY < 0) zoom in; zero deltaY is a no-op.
 */
export function wheelZoomFactor(ctrlKey: boolean, deltaY: number): number {
  if (deltaY === 0) return 1;
  const zoomIn = ctrlKey ? deltaY < 0 : deltaY > 0;
  return zoomIn ? WHEEL_FACTOR : 1 / WHEEL_FACTOR;
}

/** Next image index, wrapping to the first; total ≤ 0 keeps current. */
export function nextIndex(current: number, total: number): number {
  if (total <= 0) return current;
  return (current + 1) % total;
}

/** Previous image index, wrapping to the last; total ≤ 0 keeps current. */
export function prevIndex(current: number, total: number): number {
  if (total <= 0) return current;
  return (current - 1 + total) % total;
}

/** "N / M" counter label. */
export function formatCounter(index: number, total: number): string {
  return `${index + 1} / ${total}`;
}

/** CSS transform for the lightbox stage image. */
export function applyTransform(s: ZoomState): string {
  return `translate(${s.tx}px, ${s.ty}px) scale(${s.scale})`;
}

/** SSR template gate: thumbnail strip renders only for 2+ images. */
export function shouldShowThumbStrip(count: number): boolean {
  return count > 1;
}
