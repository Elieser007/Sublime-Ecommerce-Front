/**
 * Public API Client — Storefront Data
 *
 * Typed fetch functions for the public (no auth) storefront endpoints.
 * All functions use the PUBLIC_API_URL environment variable.
 */

import type { GalleryImage } from "./image-types";

const API_URL = (typeof import.meta !== "undefined" && import.meta.env?.PUBLIC_API_URL) || "http://localhost:8787";

// ─── TYPES ────────────────────────────────────────────────

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
}

/**
 * @deprecated Use GalleryImage from './image-types' instead.
 * Kept as alias for backward compatibility.
 */
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

// ─── PRICE TIERS ────────────────────────────────────────────

export interface PriceTier {
  id: string;
  branch_id: string;
  branch_name: string;
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

// ─── HELPERS ──────────────────────────────────────────────

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

// ─── PRODUCTS ─────────────────────────────────────────────

/**
 * Fetch paginated product listing.
 * @param params - URLSearchParams with page, limit, section_id, etc.
 */
export async function fetchProducts(
  params?: URLSearchParams
): Promise<PaginatedResponse<PublicProduct>> {
  const queryString = params ? `?${params.toString()}` : "";
  const data = await fetchJson<PaginatedResponse<PublicProduct>>(
    `${API_URL}/api/public/products${queryString}`
  );
  return data;
}

/**
 * Fetch featured (latest 8) products.
 */
export async function fetchFeaturedProducts(): Promise<PublicProduct[]> {
  const data = await fetchJson<{ products: PublicProduct[] }>(
    `${API_URL}/api/public/products/featured`
  );
  return data.products || [];
}

/**
 * Fetch a single product by ID with full details.
 */
export async function fetchProductById(
  id: string
): Promise<ProductDetail> {
  const data = await fetchJson<{ product: ProductDetail }>(
    `${API_URL}/api/public/products/${encodeURIComponent(id)}`
  );
  return data.product;
}

/**
 * Fetch a single product by slug with full details.
 * For SEO-friendly URLs.
 */
export async function fetchProductBySlug(
  slug: string
): Promise<ProductDetail> {
  const data = await fetchJson<{ product: ProductDetail }>(
    `${API_URL}/api/public/products/slug/${encodeURIComponent(slug)}`
  );
  return data.product;
}

// ─── CATEGORIES ───────────────────────────────────────────

/**
 * Fetch all active sections.
 */
export async function fetchSections(): Promise<Section[]> {
  const data = await fetchJson<{ sections: Section[] }>(
    `${API_URL}/api/public/sections`
  );
  return data.sections || [];
}

/**
 * Fetch the full category tree (sections → categories → subcategories).
 */
export async function fetchCategoryTree(): Promise<CategoryNode[]> {
  const data = await fetchJson<{ tree: CategoryNode[] }>(
    `${API_URL}/api/public/categories/tree`
  );
  return data.tree || [];
}

// ─── UTILITIES ────────────────────────────────────────────

/**
 * Format price in Guaraníes (no decimals).
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-PY", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Get the image URL for a product, or a placeholder.
 */
export function getProductImageUrl(
  imageUrl: string | null | undefined
): string {
  return imageUrl || "/placeholder-product.svg";
}