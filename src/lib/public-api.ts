import type { GalleryImage } from "./image-types";
import { getApiUrl } from "./api-url";

const API_URL = getApiUrl();

export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  section_name: string | null;
  category_name: string | null;
  subcategory_name: string | null;
  section_slug: string | null;
  category_slug: string | null;
  subcategory_slug: string | null;
  image_url: string | null;
  created_at: number;
  price_tiers?: PriceTier[];
  has_variants?: boolean;
}

/** @deprecated Use GalleryImage from './image-types' instead. */
export type ProductImage = GalleryImage;

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number | null;
  stock: number;
}

export interface ProductDetail extends PublicProduct {
  images: GalleryImage[];
  variants: ProductVariant[];
  price_tiers?: PriceTier[];
}

export interface PriceTier {
  id: string;
  branch_id?: string;
  branch_name?: string;
  min_quantity: number;
  price: number;
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    subcategories: Array<{
      id: string;
      name: string;
      slug: string;
    }>;
  }>;
}

export interface Section {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Not found");
    }
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchProducts(
  params?: URLSearchParams
): Promise<PaginatedResponse<PublicProduct>> {
  const queryString = params ? `?${params.toString()}` : "";
  const data = await fetchJson<PaginatedResponse<PublicProduct>>(
    `${API_URL}/api/public/products${queryString}`
  );
  return data;
}

export async function fetchFeaturedProducts(): Promise<PublicProduct[]> {
  const data = await fetchJson<{ products: PublicProduct[] }>(
    `${API_URL}/api/public/products/featured`
  );
  return data.products || [];
}

export async function fetchProductById(
  id: string
): Promise<ProductDetail> {
  const data = await fetchJson<{ product: ProductDetail }>(
    `${API_URL}/api/public/products/${encodeURIComponent(id)}`
  );
  return data.product;
}

export async function fetchProductBySlug(
  slug: string
): Promise<ProductDetail> {
  const data = await fetchJson<{ product: ProductDetail }>(
    `${API_URL}/api/public/products/slug/${encodeURIComponent(slug)}`
  );
  return data.product;
}

export async function fetchSections(): Promise<Section[]> {
  const data = await fetchJson<{ sections: Section[] }>(
    `${API_URL}/api/public/sections`
  );
  return data.sections || [];
}

export async function fetchCategoryTree(): Promise<CategoryNode[]> {
  const data = await fetchJson<{ tree: CategoryNode[] }>(
    `${API_URL}/api/public/categories/tree`
  );
  return data.tree || [];
}

export { formatPrice } from "./format";

export function getProductImageUrl(
  imageUrl: string | null | undefined
): string {
  if (imageUrl == null) return "/placeholder-product.svg";
  const trimmed = imageUrl.trim();
  if (trimmed === "" || trimmed === "null" || trimmed === "undefined" || trimmed === "/null") {
    return "/placeholder-product.svg";
  }
  return trimmed;
}