/**
 * variant-filter — client-side port of the backend's /variants availability
 * semantics. Pure functions, tested without a browser.
 *
 * Fixtures mirror the real seeded product (camiseta-gimnasio):
 *   mod-color (ColorSelector): negro / blanco / gris
 *   mod-size  (SizeSelector):  s / m / l / xl
 *   dependency: size=m → color=negro only
 */

import { describe, it, expect } from "vitest";
import {
  resolveAvailable,
  resolveFinalPrice,
  type BakedModule,
  type VariantDependency,
} from "./variant-filter";

const MODULES: BakedModule[] = [
  {
    module_id: "mod-color",
    name: "Color",
    slug: "color",
    frontend_component: "ColorSelector",
    sort_order: 1,
    values: [
      { value_id: "val-negro", label: "Negro", raw_value: "negro", hex_color: "#000000", price_modifier: 0, available: true },
      { value_id: "val-blanco", label: "Blanco", raw_value: "blanco", hex_color: "#FFFFFF", price_modifier: 0, available: true },
      { value_id: "val-gris", label: "Gris", raw_value: "gris", hex_color: "#808080", price_modifier: 0, available: true },
    ],
  },
  {
    module_id: "mod-size",
    name: "Talle",
    slug: "size",
    frontend_component: "SizeSelector",
    sort_order: 2,
    values: [
      { value_id: "val-s", label: "S", raw_value: "s", hex_color: null, price_modifier: 0, available: true },
      { value_id: "val-m", label: "M", raw_value: "m", hex_color: null, price_modifier: 0, available: true },
      { value_id: "val-l", label: "L", raw_value: "l", hex_color: null, price_modifier: 200, available: true },
      { value_id: "val-xl", label: "XL", raw_value: "xl", hex_color: null, price_modifier: 500, available: true },
    ],
  },
];

const SIZE_RESTRICTS_COLOR: VariantDependency[] = [
  {
    parent_module_id: "mod-size",
    parent_value_id: "val-m",
    child_module_id: "mod-color",
    child_value_id: "val-negro",
  },
];

function availableLabels(modules: BakedModule[], moduleId: string): string[] {
  const mod = modules.find((m) => m.module_id === moduleId);
  return (mod?.values || []).filter((v) => v.available).map((v) => v.label);
}

describe("resolveAvailable — dependency filtering (backend parity)", () => {
  it("no selection: every value of every module is available", () => {
    const resolved = resolveAvailable(MODULES, SIZE_RESTRICTS_COLOR);
    expect(availableLabels(resolved, "mod-color")).toEqual(["Negro", "Blanco", "Gris"]);
    expect(availableLabels(resolved, "mod-size")).toEqual(["S", "M", "L", "XL"]);
  });

  it("size=M selected: only the allowed color (Negro) stays available", () => {
    const resolved = resolveAvailable(MODULES, SIZE_RESTRICTS_COLOR, { "mod-size": "val-m" });
    expect(availableLabels(resolved, "mod-color")).toEqual(["Negro"]);
    expect(availableLabels(resolved, "mod-size")).toEqual(["S", "M", "L", "XL"]);
  });

  it("size=S selected: no restriction applies, all colors available", () => {
    const resolved = resolveAvailable(MODULES, SIZE_RESTRICTS_COLOR, { "mod-size": "val-s" });
    expect(availableLabels(resolved, "mod-color")).toEqual(["Negro", "Blanco", "Gris"]);
  });

  it("matches the live backend behaviour for selected={size:m}", () => {
    // Verified against GET /variants?selected={"size":"m"} → Color ['Negro']
    const resolved = resolveAvailable(MODULES, SIZE_RESTRICTS_COLOR, new Map([["mod-size", "val-m"]]));
    expect(availableLabels(resolved, "mod-color")).toEqual(["Negro"]);
  });

  it("empty modules → empty result", () => {
    expect(resolveAvailable([], SIZE_RESTRICTS_COLOR)).toEqual([]);
  });

  it("module without relevant dependencies is never constrained", () => {
    const resolved = resolveAvailable(MODULES, SIZE_RESTRICTS_COLOR, { "mod-color": "val-negro" });
    // color is a parent, not a child here → size unaffected
    expect(availableLabels(resolved, "mod-size")).toEqual(["S", "M", "L", "XL"]);
  });

  it("child_value_id null means the whole child module is allowed", () => {
    const deps: VariantDependency[] = [
      { parent_module_id: "mod-color", parent_value_id: "val-negro", child_module_id: "mod-size", child_value_id: null },
    ];
    const resolved = resolveAvailable(MODULES, deps, { "mod-color": "val-negro" });
    expect(availableLabels(resolved, "mod-size")).toEqual(["S", "M", "L", "XL"]);
  });

  it("AND across parents: value allowed only when every selected parent allows it", () => {
    const deps: VariantDependency[] = [
      { parent_module_id: "mod-a", parent_value_id: "val-a1", child_module_id: "mod-c", child_value_id: "val-c1" },
      { parent_module_id: "mod-b", parent_value_id: "val-b1", child_module_id: "mod-c", child_value_id: "val-c2" },
    ];
    const modules: BakedModule[] = [
      {
        module_id: "mod-c",
        name: "C",
        slug: "c",
        frontend_component: "SizeSelector",
        sort_order: 1,
        values: [
          { value_id: "val-c1", label: "C1", raw_value: "c1", hex_color: null, price_modifier: 0, available: true },
          { value_id: "val-c2", label: "C2", raw_value: "c2", hex_color: null, price_modifier: 0, available: true },
        ],
      },
    ];
    // Only a1 selected → a1 restricts mod-c to {c1}, so c2 is unavailable
    expect(availableLabels(resolveAvailable(modules, deps, { "mod-a": "val-a1" }), "mod-c")).toEqual(["C1"]);
    // Both selected → c1 blocked by b (b only allows c2), c2 blocked by a (a only allows c1)
    expect(availableLabels(resolveAvailable(modules, deps, { "mod-a": "val-a1", "mod-b": "val-b1" }), "mod-c")).toEqual([]);
  });

  it("a module never constrains its own values", () => {
    const deps: VariantDependency[] = [
      { parent_module_id: "mod-size", parent_value_id: "val-m", child_module_id: "mod-size", child_value_id: "val-l" },
    ];
    const resolved = resolveAvailable(MODULES, deps, { "mod-size": "val-m" });
    expect(availableLabels(resolved, "mod-size")).toEqual(["S", "M", "L", "XL"]);
  });

  it("only directly-selected parents constrain (no transitive chains)", () => {
    // a1→b1 and b1→c1, but only a1 selected: c must NOT be constrained
    // because b1 is not directly selected.
    const deps: VariantDependency[] = [
      { parent_module_id: "mod-a", parent_value_id: "val-a1", child_module_id: "mod-b", child_value_id: "val-b1" },
      { parent_module_id: "mod-b", parent_value_id: "val-b1", child_module_id: "mod-c", child_value_id: "val-c1" },
    ];
    const modules: BakedModule[] = [
      {
        module_id: "mod-b",
        name: "B",
        slug: "b",
        frontend_component: "SizeSelector",
        sort_order: 1,
        values: [
          { value_id: "val-b1", label: "B1", raw_value: "b1", hex_color: null, price_modifier: 0, available: true },
          { value_id: "val-b2", label: "B2", raw_value: "b2", hex_color: null, price_modifier: 0, available: true },
        ],
      },
      {
        module_id: "mod-c",
        name: "C",
        slug: "c",
        frontend_component: "SizeSelector",
        sort_order: 2,
        values: [
          { value_id: "val-c1", label: "C1", raw_value: "c1", hex_color: null, price_modifier: 0, available: true },
          { value_id: "val-c2", label: "C2", raw_value: "c2", hex_color: null, price_modifier: 0, available: true },
        ],
      },
    ];
    // Selecting a1 directly constrains mod-b to {b1}; mod-c is NOT constrained
    // because its parent (mod-b) is not directly selected — no transitive chains.
    const resolved = resolveAvailable(modules, deps, { "mod-a": "val-a1" });
    expect(availableLabels(resolved, "mod-b")).toEqual(["B1"]);
    expect(availableLabels(resolved, "mod-c")).toEqual(["C1", "C2"]);
  });

  it("does not mutate the input modules", () => {
    const original = JSON.stringify(MODULES);
    resolveAvailable(MODULES, SIZE_RESTRICTS_COLOR, { "mod-size": "val-m" });
    expect(JSON.stringify(MODULES)).toBe(original);
  });
});

describe("resolveFinalPrice", () => {
  it("base price with no selections", () => {
    expect(resolveFinalPrice(130000, MODULES)).toBe(130000);
  });

  it("sums price modifiers of selected values", () => {
    expect(resolveFinalPrice(130000, MODULES, { "mod-size": "val-xl" })).toBe(130500);
    expect(resolveFinalPrice(130000, MODULES, new Map([["mod-size", "val-l"]]))).toBe(130200);
  });

  it("floors at 0", () => {
    const cheap = [{ ...MODULES[1], values: [{ value_id: "val-m", label: "M", raw_value: "m", hex_color: null, price_modifier: -300, available: true }] }];
    expect(resolveFinalPrice(100, cheap, { "mod-size": "val-m" })).toBe(0);
  });

  it("ignores selections whose value no longer exists", () => {
    expect(resolveFinalPrice(130000, MODULES, { "mod-gone": "val-ghost" })).toBe(130000);
  });
});
