/**
 * Admin Products — Server-side logic extracted for testability
 *
 * Pure functions for product list loading and gallery upload.
 * Extracted from products.astro <script> to enable TDD.
 */


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

// ─── loadProductList ────────────────────────────────────────

/**
 * Fetch a paginated product list from the API.
 *
 * The response already includes `attribute_count` per product
 * (backend Phase 2). No N+1 preloading needed.
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
      return { items: [], total: 0, totalPages: 1 };
    }

    const data = await res.json();
    return {
      items: data.data || [],
      total: data.total || 0,
      totalPages: data.pages || 1,
    };
  } catch {
    return { items: [], total: 0, totalPages: 1 };
  }
}

// ─── uploadGalleryImages ────────────────────────────────────

/**
 * Upload gallery images concurrently using Promise.allSettled.
 *
 * Each image is uploaded to R2 via POST /api/upload, then
 * associated with the product via POST /api/products/:id/images.
 * Partial failures are handled gracefully — successful uploads
 * still get associated with the product.
 */
export async function uploadGalleryImages(
  files: File[],
  productId: string,
  apiUrl: string
): Promise<GalleryUploadResult[]> {
  if (files.length === 0) return [];

  const uploadPromises = files.map(async (file, index) => {
    const formData = new FormData();
    const fileName = file.name.replace(/\.[^.]+$/, ".webp") || "gallery.webp";
    formData.append("image", new File([file], fileName, { type: "image/webp" }));

    const uploadRes = await fetch(`${apiUrl}/api/upload`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error(err.error || "Error uploading image");
    }

    const uploadData = await uploadRes.json();

    const sortOrder = index;

    const associateRes = await fetch(`${apiUrl}/api/products/${productId}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ url: uploadData.url, alt: "", is_primary: 0, sort_order: sortOrder }),
    });

    if (!associateRes.ok) {
      const err = await associateRes.json().catch(() => ({}));
      throw new Error(err.error || "Error associating image");
    }

    return uploadData;
  });

  return Promise.allSettled(uploadPromises);
}
