/**
 * Product Form Logic — Handles product creation/update API calls
 *
 * Extracted from AdminProductForm.astro for testability.
 * Sends product data (including image URL) to the backend API.
 *
 * Image operations delegate to generic image-utils.ts.
 */

import {
  uploadImage as genericUploadImage,
  associateImage as genericAssociateImage,
  replaceImage as genericReplaceImage,
  fetchEntityImages as genericFetchEntityImages,
  buildImagePayload,
} from './image-utils';

export interface ProductFormData {
  name: string;
  price: number | null;
  category: string;
  description?: string;
  imageUrl?: string;
  alt?: string;
}

export interface ProductApiResponse {
  success: boolean;
  product?: {
    id: string;
    name: string;
    slug: string;
  };
  error?: string;
}

export interface ImageApiResponse {
  success: boolean;
  image?: {
    id: string;
    url: string;
    alt: string | null;
    is_primary: boolean;
  };
  error?: string;
}

/**
 * Validate product form data before submission.
 * Returns an error message if invalid, or null if valid.
 */
export function validateProductForm(data: ProductFormData): string | null {
  if (!data.name || data.name.trim().length === 0) {
    return "El nombre es requerido";
  }

  if (data.price === null || data.price === undefined || data.price < 0) {
    return "El precio es requerido y debe ser positivo";
  }

  if (!data.category || data.category.trim().length === 0) {
    return "La categoría es requerida";
  }

  return null;
}

/**
 * Build the product creation payload from form data.
 */
export function buildProductPayload(data: ProductFormData) {
  return {
    name: data.name.trim(),
    basePrice: data.price,
    description: data.description?.trim() || undefined,
  };
}

// Re-export buildImagePayload for backward compatibility
export { buildImagePayload };

/**
 * Create a new product via POST /api/products.
 */
export async function createProduct(
  data: ProductFormData,
  apiUrl: string = ""
): Promise<ProductApiResponse> {
  const payload = buildProductPayload(data);

  const res = await fetch(`${apiUrl}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      success: false,
      error: body.error || `HTTP ${res.status}`,
    };
  }

  return await res.json();
}

/**
 * Associate an image with a product via POST /api/products/:id/images.
 * Delegates to generic associateImage in image-utils.ts.
 */
export async function associateImage(
  productId: string,
  url: string,
  alt?: string,
  apiUrl: string = ""
): Promise<ImageApiResponse> {
  try {
    const result = await genericAssociateImage('products', productId, url, apiUrl, alt);
    return { success: true, image: result };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error associating image',
    };
  }
}

/**
 * Replace a product image via PUT /api/products/:id/images/:imageId.
 * Delegates to generic replaceImage in image-utils.ts.
 */
export async function replaceImage(
  productId: string,
  imageId: string,
  url: string,
  alt?: string,
  apiUrl: string = ""
): Promise<ImageApiResponse> {
  try {
    const result = await genericReplaceImage('products', productId, imageId, url, apiUrl, alt);
    return { success: true, image: result };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error replacing image',
    };
  }
}

/**
 * Fetch a product's images via GET /api/products/:id.
 * Delegates to generic fetchEntityImages in image-utils.ts.
 */
export async function fetchProductImages(
  productId: string,
  apiUrl: string = ""
): Promise<{ success: boolean; images?: Array<{ id: string; url: string; alt: string | null; is_primary: number }>; error?: string }> {
  try {
    const images = await genericFetchEntityImages('products', productId, apiUrl);
    return { success: true, images };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error fetching images',
    };
  }
}

/**
 * Upload an image file to the backend.
 * Delegates to generic uploadImage in image-utils.ts.
 */
export async function uploadImage(
  file: File,
  apiUrl: string = ""
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const result = await genericUploadImage(file, apiUrl);
    return { success: true, url: result.url };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error uploading image',
    };
  }
}

/**
 * Full product creation flow:
 * 1. Create product
 * 2. If imageUrl provided, associate it with the product
 *
 * Returns the product ID on success.
 */
export async function createProductWithImage(
  data: ProductFormData,
  apiUrl: string = ""
): Promise<{ success: boolean; productId?: string; error?: string }> {
  // Step 1: Create product
  const productResult = await createProduct(data, apiUrl);

  if (!productResult.success) {
    return { success: false, error: productResult.error };
  }

  const productId = productResult.product!.id;

  // Step 2: Associate image if URL provided
  if (data.imageUrl) {
    const imageResult = await associateImage(productId, data.imageUrl, data.alt, apiUrl);

    if (!imageResult.success) {
      // Product was created but image failed — report partial success
      return {
        success: false,
        productId,
        error: `Producto creado pero imagen no asociada: ${imageResult.error}`,
      };
    }
  }

  return { success: true, productId };
}
