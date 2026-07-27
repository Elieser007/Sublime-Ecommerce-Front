/**
 * Generic Image Utilities
 *
 * Reusable functions for image CRUD operations on any entity type.
 * Works for products, categories, banners, etc.
 */

import type { GalleryImage, UploadResult, ImageAssociationPayload } from './image-types';

/**
 * Upload an image file to R2 via POST /api/upload
 * Generic — works for any entity
 */
export async function uploadImage(
  file: File,
  apiUrl: string
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${apiUrl}/api/upload`, {
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
  entityType: string, // 'products', 'categories', 'banners', etc.
  entityId: string,
  url: string,
  apiUrl: string,
  alt?: string,
  options?: { is_primary?: number; sort_order?: number }
): Promise<GalleryImage> {
  const payload = buildImagePayload(url, alt, options);

  const res = await fetch(`${apiUrl}/api/${entityType}/${entityId}/images`, {
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
  apiUrl: string,
  alt?: string
): Promise<GalleryImage> {
  const payload = buildImagePayload(url, alt);

  const res = await fetch(`${apiUrl}/api/${entityType}/${entityId}/images/${imageId}`, {
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
  apiUrl: string
): Promise<void> {
  const res = await fetch(`${apiUrl}/api/${entityType}/${entityId}/images/${imageId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error deleting image');
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
  apiUrl: string,
  metadata: { alt?: string; sort_order?: number; is_primary?: boolean }
): Promise<GalleryImage> {
  const res = await fetch(`${apiUrl}/api/${entityType}/${entityId}/images/${imageId}`, {
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
  apiUrl: string
): Promise<GalleryImage[]> {
  const res = await fetch(`${apiUrl}/api/${entityType}/${entityId}/images`, {
    credentials: 'include',
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return data.images || data[entityType]?.images || [];
}
