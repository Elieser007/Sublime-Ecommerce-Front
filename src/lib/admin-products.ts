/**
 * Admin Products — Server-side logic extracted for testability
 *
 * Pure functions for product list loading and gallery upload.
 * Extracted from products.astro <script> to enable TDD.
 */

import { uploadAndAssociate } from './image-utils';

// ─── Types ──────────────────────────────────────────────────

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  sectionId?: string;
  categoryId?: string;
  subcategoryId?: string;
  isActive?: boolean;
}

export interface ProductListResult {
  items: any[];
  total: number;
  totalPages: number;
}

export interface GalleryUploadResult {
  status: "fulfilled" | "rejected";
  value?: any;
  reason?: any;
}

/**
 * Error thrown when the product list endpoint returns an auth-related
 * status (401/403) so callers can redirect to /login or surface a
 * permission message instead of silently showing an empty table.
 */
export class ProductListHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ProductListHttpError";
    this.status = status;
  }
}

// ─── loadProductList ────────────────────────────────────────

/**
 * Fetch a paginated product list from the API.
 *
 * The response already includes `attribute_count` per product
 * (backend Phase 2). No N+1 preloading needed.
 *
 * Auth handling mirrors branches/users/orders: 401 throws (caller redirects
 * to /login), 403 throws with the status so callers can show a permission
 * error, and any other non-OK response returns an empty result.
 */
export async function loadProductList(
  apiUrl: string,
  params: ProductListParams
): Promise<ProductListResult> {
  try {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.search) query.set("search", params.search);
    if (params.sectionId) query.set("section_id", params.sectionId);
    if (params.categoryId) query.set("category_id", params.categoryId);
    if (params.subcategoryId) query.set("subcategory_id", params.subcategoryId);
    if (params.isActive !== undefined) query.set("is_active", params.isActive ? "1" : "0");

    const res = await fetch(`${apiUrl}/api/products?${query.toString()}`, {
      credentials: "include",
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new ProductListHttpError(401, "Unauthorized");
      }
      if (res.status === 403) {
        throw new ProductListHttpError(403, "Forbidden");
      }
      return { items: [], total: 0, totalPages: 1 };
    }

    const data = await res.json();
    return {
      items: data.data || [],
      total: data.total || 0,
      totalPages: data.pages || 1,
    };
  } catch (err) {
    if (err instanceof ProductListHttpError) throw err;
    return { items: [], total: 0, totalPages: 1 };
  }
}

// ─── uploadGalleryImages ────────────────────────────────────

/**
 * Upload gallery images concurrently using Promise.allSettled.
 *
 * Each image goes through the single upload path in image-utils.ts
 * (uploadAndAssociate → uploadImageBlob → POST /api/upload), then is
 * associated with the product. Partial failures are handled gracefully —
 * successful uploads still get associated with the product.
 */
export async function uploadGalleryImages(
  files: File[],
  productId: string,
  apiUrl?: string,
  startSortOrder = 0
): Promise<GalleryUploadResult[]> {
  if (files.length === 0) return [];

  const uploadPromises = files.map(async (file, index) => {
    const sortOrder = startSortOrder + index;

    return uploadAndAssociate('products', productId, file, file.name, apiUrl, {
      alt: '',
      is_primary: 0,
      sort_order: sortOrder,
    });
  });

  return Promise.allSettled(uploadPromises);
}
