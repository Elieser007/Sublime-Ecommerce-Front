/**
 * Generic Image Types
 *
 * Shared types for image operations across entities
 * (products, categories, banners, etc.)
 */

export interface GalleryImage {
  id: string;
  url: string;
  alt: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface ImageAssociationPayload {
  url: string;
  alt?: string;
  is_primary?: number;
  sort_order?: number;
}
