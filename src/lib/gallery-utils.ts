/**
 * Gallery Utils — Pure functions for image gallery navigation
 *
 * All functions are pure (no side effects) and work with the
 * GalleryImage type from image-types.ts.
 */

import type { GalleryImage } from "./image-types";

/**
 * Find an image by its id.
 */
export function getImageById(
  images: GalleryImage[],
  id: string
): GalleryImage | undefined {
  return images.find((img) => img.id === id);
}

/**
 * Get the next image after currentId. Wraps around from last to first.
 */
export function getNextImage(
  images: GalleryImage[],
  currentId: string
): GalleryImage | undefined {
  if (images.length === 0) return undefined;
  const index = images.findIndex((img) => img.id === currentId);
  if (index === -1) return undefined;
  return images[(index + 1) % images.length];
}

/**
 * Get the previous image before currentId. Wraps around from first to last.
 */
export function getPrevImage(
  images: GalleryImage[],
  currentId: string
): GalleryImage | undefined {
  if (images.length === 0) return undefined;
  const index = images.findIndex((img) => img.id === currentId);
  if (index === -1) return undefined;
  return images[(index - 1 + images.length) % images.length];
}

/**
 * Get the primary image, or the first image if no primary is set.
 */
export function getPrimaryImage(
  images: GalleryImage[]
): GalleryImage | undefined {
  if (images.length === 0) return undefined;
  return images.find((img) => img.is_primary) || images[0];
}

/**
 * Get the total number of images.
 */
export function getImageCount(images: GalleryImage[]): number {
  return images.length;
}
