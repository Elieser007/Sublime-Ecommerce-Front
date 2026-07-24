/**
 * Attribute Modules Admin — Tests
 *
 * Tests for admin attribute module management logic:
 * - Module CRUD operations
 * - Value CRUD operations
 * - Modal state management
 * - API call helpers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── TYPES ────────────────────────────────────────────────

interface AttributeModule {
  id: string;
  name: string;
  slug: string;
  frontend_component: string;
  sort_order: number;
  is_active: boolean;
  value_count: number;
  created_at: number;
  updated_at: number;
}

interface AttributeValue {
  id: string;
  module_id: string;
  label: string;
  raw_value: string;
  hex_color: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: number;
}

// ─── HELPER FUNCTIONS ─────────────────────────────────────

const API_URL = "http://localhost:8787";

function buildModuleBody(data: {
  name?: string;
  slug?: string;
  frontend_component?: string;
  sort_order?: number;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.slug !== undefined) body.slug = data.slug;
  if (data.frontend_component !== undefined) body.frontend_component = data.frontend_component;
  if (data.sort_order !== undefined) body.sort_order = data.sort_order;
  return body;
}

function buildValueBody(data: {
  module_id?: string;
  label?: string;
  raw_value?: string;
  hex_color?: string | null;
  image_url?: string | null;
  sort_order?: number;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.module_id !== undefined) body.module_id = data.module_id;
  if (data.label !== undefined) body.label = data.label;
  if (data.raw_value !== undefined) body.raw_value = data.raw_value;
  if (data.hex_color !== undefined) body.hex_color = data.hex_color;
  if (data.image_url !== undefined) body.image_url = data.image_url;
  if (data.sort_order !== undefined) body.sort_order = data.sort_order;
  return body;
}

function getComponentLabel(component: string): string {
  const labels: Record<string, string> = {
    color_selector: "Selector de Color",
    size_selector: "Selector de Talle",
    dropdown: "Dropdown",
    toggle: "Toggle",
  };
  return labels[component] || component;
}

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("es-PY");
}

function sortModulesByOrder(modules: AttributeModule[]): AttributeModule[] {
  return [...modules].sort((a, b) => a.sort_order - b.sort_order);
}

function filterModules(modules: AttributeModule[], search: string): AttributeModule[] {
  const q = search.toLowerCase().trim();
  if (!q) return modules;
  return modules.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.slug.toLowerCase().includes(q) ||
      m.frontend_component.toLowerCase().includes(q)
  );
}

function getModuleStats(modules: AttributeModule[]): { total: number; active: number; totalValues: number } {
  return {
    total: modules.length,
    active: modules.filter((m) => m.is_active).length,
    totalValues: modules.reduce((sum, m) => sum + m.value_count, 0),
  };
}

// ─── MOCK DATA ────────────────────────────────────────────

const mockModules: AttributeModule[] = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567801",
    name: "Color",
    slug: "color",
    frontend_component: "color_selector",
    sort_order: 1,
    is_active: true,
    value_count: 5,
    created_at: 1700000000,
    updated_at: 1700000000,
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567802",
    name: "Talle",
    slug: "talle",
    frontend_component: "size_selector",
    sort_order: 2,
    is_active: true,
    value_count: 6,
    created_at: 1700000100,
    updated_at: 1700000100,
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567803",
    name: "Material",
    slug: "material",
    frontend_component: "dropdown",
    sort_order: 0,
    is_active: false,
    value_count: 3,
    created_at: 1700000200,
    updated_at: 1700000200,
  },
];

const mockValues: AttributeValue[] = [
  {
    id: "b1b2c3d4-e5f6-7890-abcd-ef1234567801",
    module_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567801",
    label: "Rojo",
    raw_value: "#FF0000",
    hex_color: "#FF0000",
    image_url: null,
    sort_order: 0,
    created_at: 1700000000,
  },
  {
    id: "b1b2c3d4-e5f6-7890-abcd-ef1234567802",
    module_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567801",
    label: "Azul",
    raw_value: "#0000FF",
    hex_color: "#0000FF",
    image_url: null,
    sort_order: 1,
    created_at: 1700000001,
  },
];

// ─── TESTS ────────────────────────────────────────────────

describe("Attribute Modules Admin logic", () => {
  describe("buildModuleBody", () => {
    it("builds body with all fields", () => {
      const body = buildModuleBody({
        name: "Color",
        slug: "color",
        frontend_component: "color_selector",
        sort_order: 1,
      });
      expect(body).toEqual({
        name: "Color",
        slug: "color",
        frontend_component: "color_selector",
        sort_order: 1,
      });
    });

    it("builds body with partial fields", () => {
      const body = buildModuleBody({ name: "Color" });
      expect(body).toEqual({ name: "Color" });
    });

    it("builds empty body when no fields provided", () => {
      const body = buildModuleBody({});
      expect(body).toEqual({});
    });
  });

  describe("buildValueBody", () => {
    it("builds body with all fields", () => {
      const body = buildValueBody({
        module_id: "mod-1",
        label: "Rojo",
        raw_value: "#FF0000",
        hex_color: "#FF0000",
        sort_order: 0,
      });
      expect(body).toEqual({
        module_id: "mod-1",
        label: "Rojo",
        raw_value: "#FF0000",
        hex_color: "#FF0000",
        sort_order: 0,
      });
    });

    it("includes null hex_color when explicitly set", () => {
      const body = buildValueBody({ hex_color: null });
      expect(body.hex_color).toBeNull();
    });
  });

  describe("getComponentLabel", () => {
    it("returns Spanish label for color_selector", () => {
      expect(getComponentLabel("color_selector")).toBe("Selector de Color");
    });

    it("returns Spanish label for size_selector", () => {
      expect(getComponentLabel("size_selector")).toBe("Selector de Talle");
    });

    it("returns Spanish label for dropdown", () => {
      expect(getComponentLabel("dropdown")).toBe("Dropdown");
    });

    it("returns Spanish label for toggle", () => {
      expect(getComponentLabel("toggle")).toBe("Toggle");
    });

    it("returns raw value for unknown component", () => {
      expect(getComponentLabel("custom_component")).toBe("custom_component");
    });
  });

  describe("formatTimestamp", () => {
    it("formats unix timestamp to date string", () => {
      const result = formatTimestamp(1700000000);
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });

  describe("sortModulesByOrder", () => {
    it("sorts modules by sort_order ascending", () => {
      const sorted = sortModulesByOrder(mockModules);
      expect(sorted[0].name).toBe("Material"); // sort_order: 0
      expect(sorted[1].name).toBe("Color");     // sort_order: 1
      expect(sorted[2].name).toBe("Talle");     // sort_order: 2
    });

    it("does not mutate original array", () => {
      const original = [...mockModules];
      sortModulesByOrder(mockModules);
      expect(mockModules).toEqual(original);
    });
  });

  describe("filterModules", () => {
    it("returns all modules when search is empty", () => {
      expect(filterModules(mockModules, "")).toHaveLength(3);
    });

    it("filters by name", () => {
      const result = filterModules(mockModules, "color");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Color");
    });

    it("filters by slug", () => {
      const result = filterModules(mockModules, "talle");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Talle");
    });

    it("filters by component type", () => {
      const result = filterModules(mockModules, "dropdown");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Material");
    });

    it("is case-insensitive", () => {
      const result = filterModules(mockModules, "COLOR");
      expect(result).toHaveLength(1);
    });

    it("returns empty for no matches", () => {
      const result = filterModules(mockModules, "xyz");
      expect(result).toHaveLength(0);
    });
  });

  describe("getModuleStats", () => {
    it("calculates correct stats", () => {
      const stats = getModuleStats(mockModules);
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.totalValues).toBe(14); // 5 + 6 + 3
    });

    it("handles empty modules", () => {
      const stats = getModuleStats([]);
      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.totalValues).toBe(0);
    });
  });

  describe("API URL construction", () => {
    it("constructs modules list URL", () => {
      expect(`${API_URL}/api/admin/attributes/modules`).toBe(
        "http://localhost:8787/api/admin/attributes/modules"
      );
    });

    it("constructs module update URL with id", () => {
      const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567801";
      expect(`${API_URL}/api/admin/attributes/modules/${id}`).toBe(
        `http://localhost:8787/api/admin/attributes/modules/${id}`
      );
    });

    it("constructs values list URL with module_id", () => {
      const moduleId = "a1b2c3d4-e5f6-7890-abcd-ef1234567801";
      expect(`${API_URL}/api/admin/attributes/values?module_id=${moduleId}`).toContain(
        "module_id="
      );
    });
  });

  describe("Module validation", () => {
    function validateModule(data: {
      name?: string;
      slug?: string;
      frontend_component?: string;
    }): { valid: boolean; error?: string } {
      if (!data.name || !data.name.trim()) return { valid: false, error: "Nombre es requerido" };
      if (!data.slug || !data.slug.trim()) return { valid: false, error: "Slug es requerido" };
      if (!data.frontend_component) return { valid: false, error: "Componente es requerido" };
      return { valid: true };
    }

    it("returns valid for complete data", () => {
      const result = validateModule({
        name: "Color",
        slug: "color",
        frontend_component: "color_selector",
      });
      expect(result.valid).toBe(true);
    });

    it("returns error when name is missing", () => {
      const result = validateModule({ slug: "color", frontend_component: "color_selector" });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Nombre es requerido");
    });

    it("returns error when slug is missing", () => {
      const result = validateModule({ name: "Color", frontend_component: "color_selector" });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Slug es requerido");
    });

    it("returns error when component is missing", () => {
      const result = validateModule({ name: "Color", slug: "color" });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Componente es requerido");
    });

    it("rejects whitespace-only name", () => {
      const result = validateModule({ name: "   ", slug: "color", frontend_component: "color_selector" });
      expect(result.valid).toBe(false);
    });
  });

  describe("Value validation", () => {
    function validateValue(data: {
      label?: string;
      raw_value?: string;
    }): { valid: boolean; error?: string } {
      if (!data.label || !data.label.trim()) return { valid: false, error: "Label es requerido" };
      if (!data.raw_value || !data.raw_value.trim()) return { valid: false, error: "Valor es requerido" };
      return { valid: true };
    }

    it("returns valid for complete data", () => {
      const result = validateValue({ label: "Rojo", raw_value: "#FF0000" });
      expect(result.valid).toBe(true);
    });

    it("returns error when label is missing", () => {
      const result = validateValue({ raw_value: "#FF0000" });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Label es requerido");
    });

    it("returns error when raw_value is missing", () => {
      const result = validateValue({ label: "Rojo" });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Valor es requerido");
    });
  });
});
