/**
 * User Avatar Helpers
 *
 * Pure functions for user avatar upload state management.
 * Works with image-utils.ts for the actual upload calls.
 */

export interface AvatarState {
  blob: Blob | null;
  url: string | null;
  isNew: boolean;
}

export function createEmptyAvatarState(): AvatarState {
  return { blob: null, url: null, isNew: false };
}

export function hasAvatar(state: AvatarState): boolean {
  return !!(state.blob || state.url);
}

export function setAvatarFromBlob(state: AvatarState, blob: Blob): AvatarState {
  return { blob, url: null, isNew: true };
}

export function setAvatarFromUrl(state: AvatarState, url: string): AvatarState {
  return { blob: null, url, isNew: false };
}

export function clearAvatar(state: AvatarState): AvatarState {
  return createEmptyAvatarState();
}

/**
 * Get the preview URL for an avatar state.
 * Returns object URL for blobs, or the stored URL for existing avatars.
 */
let currentAvatarPreviewUrl: string | null = null;

export function getAvatarPreviewUrl(state: AvatarState): string | null {
  if (currentAvatarPreviewUrl) URL.revokeObjectURL(currentAvatarPreviewUrl);
  if (state.blob) {
    currentAvatarPreviewUrl = URL.createObjectURL(state.blob);
    return currentAvatarPreviewUrl;
  }
  return state.url;
}
