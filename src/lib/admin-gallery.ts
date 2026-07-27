/**
 * Admin Gallery State Logic
 *
 * Pure functions for managing product images in the admin panel.
 * All functions return new arrays — no mutation of inputs.
 */

import type { GalleryImage } from "./image-types";

/**
 * Add a new image to the end of the array with the correct sort_order.
 */
export function addImage(
  images: GalleryImage[],
  newImage: GalleryImage
): GalleryImage[] {
  const updated = images.map((img) => ({ ...img }));
  const added = { ...newImage, sort_order: updated.length };
  updated.push(added);
  return updated;
}

/**
 * Remove an image by id and reindex sort_order.
 */
export function removeImage(
  images: GalleryImage[],
  imageId: string
): GalleryImage[] {
  return images
    .filter((img) => img.id !== imageId)
    .map((img, idx) => ({ ...img, sort_order: idx }));
}

/**
 * Set the specified image as primary. Unsets any previously primary image.
 */
export function setPrimary(
  images: GalleryImage[],
  imageId: string
): GalleryImage[] {
  const found = images.some((img) => img.id === imageId);
  if (!found) return images.map((img) => ({ ...img }));

  return images.map((img) => ({
    ...img,
    is_primary: img.id === imageId,
  }));
}

/**
 * Move an image from one index to another and reindex sort_order.
 */
export function reorderImages(
  images: GalleryImage[],
  fromIndex: number,
  toIndex: number
): GalleryImage[] {
  if (fromIndex === toIndex) {
    return images.map((img) => ({ ...img }));
  }

  const result = [...images];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);

  return result.map((img, idx) => ({ ...img, sort_order: idx }));
}
