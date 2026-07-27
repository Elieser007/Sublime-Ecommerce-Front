/**
 * Promotion Upload Helpers
 *
 * Pure functions for promotion image upload state management.
 * Works with image-utils.ts for the actual upload/associate calls.
 */

import type { GalleryImage } from "./image-types";

export interface PromoImageState {
  blob: Blob | null;
  url: string | null;
  imageId: string | null;
  isNew: boolean;
}

export function createEmptyPromoImageState(): PromoImageState {
  return { blob: null, url: null, imageId: null, isNew: false };
}

export function hasPromoImage(state: PromoImageState): boolean {
  return !!(state.blob || state.url);
}

export function setPromoImageFromBlob(
  state: PromoImageState,
  blob: Blob
): PromoImageState {
  return { blob, url: null, imageId: state.imageId, isNew: true };
}

export function setPromoImageFromUrl(
  state: PromoImageState,
  url: string,
  imageId: string
): PromoImageState {
  return { blob: null, url, imageId, isNew: false };
}

export function clearPromoImage(state: PromoImageState): PromoImageState {
  return createEmptyPromoImageState();
}

/**
 * Get the preview URL for a promo image state.
 * Returns object URL for blobs, or the stored URL for existing images.
 */
let currentPromoPreviewUrl: string | null = null;

export function getPromoPreviewUrl(state: PromoImageState): string | null {
  if (currentPromoPreviewUrl) URL.revokeObjectURL(currentPromoPreviewUrl);
  if (state.blob) {
    currentPromoPreviewUrl = URL.createObjectURL(state.blob);
    return currentPromoPreviewUrl;
  }
  return state.url;
}
