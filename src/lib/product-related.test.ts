/**
 * getRelatedProducts Tests — deterministic same-section recommendations (D6)
 */

import { describe, it, expect } from "vitest";
import { getRelatedProducts } from "./product-related";

interface ListItem {
  slug: string;
  section_slug: string | null;
  created_at: number;
}

const baseProducts: ListItem[] = [
  { slug: "remera-1", section_slug: "indumentaria", created_at: 100 },
  { slug: "remera-2", section_slug: "indumentaria", created_at: 200 },
  { slug: "remera-3", section_slug: "indumentaria", created_at: 300 },
  { slug: "remera-4", section_slug: "indumentaria", created_at: 400 },
  { slug: "remera-5", section_slug: "indumentaria", created_at: 500 },
  { slug: "remera-6", section_slug: "indumentaria", created_at: 600 },
  { slug: "tote-bag", section_slug: "accesorios", created_at: 999 },
  { slug: "current", section_slug: "indumentaria", created_at: 150 },
];

describe("getRelatedProducts", () => {
  it("returns at most 4 same-section products, excluding the current one", () => {
    const related = getRelatedProducts(baseProducts, "current", "indumentaria");
    expect(related).toHaveLength(4);
    expect(related.some((p) => p.slug === "current")).toBe(false);
    expect(related.some((p) => p.slug === "tote-bag")).toBe(false);
  });

  it("orders by created_at DESC", () => {
    const related = getRelatedProducts(baseProducts, "current", "indumentaria");
    expect(related.map((p) => p.slug)).toEqual(["remera-6", "remera-5", "remera-4", "remera-3"]);
  });

  it("breaks created_at ties by slug ASC for deterministic builds", () => {
    const tied = [
      { slug: "b", section_slug: "ropa", created_at: 100 },
      { slug: "a", section_slug: "ropa", created_at: 100 },
      { slug: "c", section_slug: "ropa", created_at: 100 },
      { slug: "current", section_slug: "ropa", created_at: 100 },
    ];
    const related = getRelatedProducts(tied, "current", "ropa");
    expect(related.map((p) => p.slug)).toEqual(["a", "b", "c"]);
  });

  it("respects an explicit limit", () => {
    const related = getRelatedProducts(baseProducts, "current", "indumentaria", 2);
    expect(related).toHaveLength(2);
    expect(related.map((p) => p.slug)).toEqual(["remera-6", "remera-5"]);
  });

  it("degrades to the available count when fewer than 4 exist", () => {
    const few = [
      { slug: "x1", section_slug: "calzado", created_at: 10 },
      { slug: "x2", section_slug: "calzado", created_at: 20 },
      { slug: "current", section_slug: "calzado", created_at: 30 },
    ];
    const related = getRelatedProducts(few, "current", "calzado");
    expect(related).toHaveLength(2);
    expect(related.map((p) => p.slug)).toEqual(["x2", "x1"]);
  });

  it("returns an empty list when no other product shares the section", () => {
    const alone = [
      { slug: "only", section_slug: "deco", created_at: 10 },
      { slug: "other", section_slug: "otra-seccion", created_at: 999 },
    ];
    expect(getRelatedProducts(alone, "only", "deco")).toEqual([]);
  });

  it("returns an empty list for an empty product list", () => {
    expect(getRelatedProducts([], "anything", "deco")).toEqual([]);
  });

  it("is deterministic across repeated calls with identical input", () => {
    const first = getRelatedProducts(baseProducts, "current", "indumentaria");
    const second = getRelatedProducts(baseProducts, "current", "indumentaria");
    expect(first.map((p) => p.slug)).toEqual(second.map((p) => p.slug));
  });
});
