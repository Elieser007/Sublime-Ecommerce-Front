/**
 * Generic Image Utilities — single point of failure for image CRUD.
 *
 * Every image upload/association in the app must go through this module
 * (or uploadGalleryImages in admin-products.ts, which delegates here).
 * The API base URL always resolves through getApiUrl() — never duplicate
 * the PUBLIC_API_URL fallback anywhere else.
 */

import { getApiUrl } from './api-url';
import type { GalleryImage, UploadResult, ImageAssociationPayload } from './image-types';

/**
 * Resolve the backend base URL: an explicit apiUrl wins, otherwise the
 * single source of truth (getApiUrl) is used.
 */
export function resolveApiUrl(apiUrl?: string): string {
  return apiUrl || getApiUrl();
}

/**
 * Upload an image file to R2 via POST /api/upload.
 * Generic — works for any entity.
 */
export async function uploadImage(
  file: File,
  apiUrl?: string
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${resolveApiUrl(apiUrl)}/api/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error uploading image');
  }

  return res.json();
}

/**
 * Upload a processed blob (canvas output) as WebP.
 * Names the file <name-without-ext>.webp so the backend always stores WebP.
 */
export async function uploadImageBlob(
  blob: Blob,
  name: string,
  apiUrl?: string
): Promise<UploadResult> {
  const base = (name || 'image').replace(/\.[^.]+$/, '');
  return uploadImage(new File([blob], `${base}.webp`, { type: 'image/webp' }), apiUrl);
}

/**
 * Upload a blob and associate it with an entity in one step.
 * Used by the product gallery batch, promotions and any upload→associate flow.
 */
export async function uploadAndAssociate(
  entityType: string,
  entityId: string,
  blob: Blob,
  name: string,
  apiUrl?: string,
  options?: { alt?: string; is_primary?: number; sort_order?: number }
): Promise<GalleryImage> {
  const uploadResult = await uploadImageBlob(blob, name, apiUrl);
  return associateImage(entityType, entityId, uploadResult.url!, apiUrl, options?.alt, options);
}

/**
 * Build payload for associating an image with an entity
 * Generic — works for any entity type
 */
export function buildImagePayload(url: string, alt?: string, options?: { is_primary?: number; sort_order?: number }): ImageAssociationPayload {
  return { url, alt: alt || undefined, ...options };
}

/**
 * Associate an image with an entity
 * Generic — accepts entity type and ID
 */
export async function associateImage(
  entityType: string,
  entityId: string,
  url: string,
  apiUrl?: string,
  alt?: string,
  options?: { is_primary?: number; sort_order?: number }
): Promise<GalleryImage> {
  const payload = buildImagePayload(url, alt, options);

  const res = await fetch(`${resolveApiUrl(apiUrl)}/api/${entityType}/${entityId}/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error associating image');
  }

  return res.json();
}

/**
 * Replace an image for an entity
 * Generic — accepts entity type and IDs
 */
export async function replaceImage(
  entityType: string,
  entityId: string,
  imageId: string,
  url: string,
  apiUrl?: string,
  alt?: string
): Promise<GalleryImage> {
  const payload = buildImagePayload(url, alt);

  const res = await fetch(`${resolveApiUrl(apiUrl)}/api/${entityType}/${entityId}/images/${imageId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error replacing image');
  }

  return res.json();
}

/**
 * Delete an image from an entity
 * Generic — accepts entity type and IDs
 */
export async function deleteImage(
  entityType: string,
  entityId: string,
  imageId: string,
  apiUrl?: string
): Promise<void> {
  const res = await fetch(`${resolveApiUrl(apiUrl)}/api/${entityType}/${entityId}/images/${imageId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error deleting image');
  }
}

/**
 * Delete an uploaded R2 object by filename (best-effort).
 * The entity association delete is authoritative; R2 cleanup failures
 * must not break the UI flow.
 */
export async function deleteUploadedFile(filename: string, apiUrl?: string): Promise<void> {
  try {
    await fetch(`${resolveApiUrl(apiUrl)}/api/upload/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    // Best-effort cleanup — ignore network errors.
  }
}

/**
 * Update image metadata (sort_order, is_primary, alt)
 * Generic — accepts entity type and IDs
 */
export async function updateImageMetadata(
  entityType: string,
  entityId: string,
  imageId: string,
  apiUrl?: string,
  metadata?: { alt?: string; sort_order?: number; is_primary?: boolean }
): Promise<GalleryImage> {
  const res = await fetch(`${resolveApiUrl(apiUrl)}/api/${entityType}/${entityId}/images/${imageId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error updating image metadata');
  }

  return res.json();
}

/**
 * Fetch images for an entity
 * Generic — accepts entity type and ID
 */
export async function fetchEntityImages(
  entityType: string,
  entityId: string,
  apiUrl?: string
): Promise<GalleryImage[]> {
  const res = await fetch(`${resolveApiUrl(apiUrl)}/api/${entityType}/${entityId}/images`, {
    credentials: 'include',
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return data.images || data[entityType]?.images || [];
}
