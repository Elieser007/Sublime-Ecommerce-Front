/**
 * Admin E2E — Attributes flow (tasks 2.10, design D7/D8).
 *
 * Serial per file (shared seeded D1); storageState from auth.setup (single
 * login, credentials never re-submitted). `reseedE2E()` in beforeAll re-runs
 * the deterministic Back seed so every run starts from identical rows.
 *
 * Coverage (spec "Admin Flows E2E" #8): module list against the seeded
 * catalog (mod-color "Color" — fixed ID from seed-attributes, asserted by
 * slug), module create/edit, value create, product assignment via the
 * products page AttributeManager (POST + DELETE
 * /api/admin/products/:id/attributes), and a dependency between two
 * flow-created modules (POST + DELETE /api/admin/attributes/dependencies).
 *
 * All mutations run against modules/products created by the flow itself
 * (unique names per run), so repeated runs never collide and seeded
 * fixtures are only asserted.
 */
import { test, expect, type Page } from "@playwright/test";
import { ADMIN_URLS, BACKEND_URL, reseedE2E } from "../helpers";

test.describe.configure({ mode: "serial" });

test.setTimeout(60_000);

/** Seeded attribute module (Back scripts/seed-attributes.ts, fixed id). */
const SEEDED_MODULE_NAME = "Color";
const SEEDED_MODULE_SLUG = "color";
const SEEDED_VALUE_LABEL = "Negro";
const SEEDED_VALUE_RAW = "negro";

function uniqueModuleName(): string {
  return `E2E Mod ${Date.now()}`;
}

function uniqueModuleSlug(): string {
  return `e2e-mod-${Date.now()}`;
}

function uniqueProductName(): string {
  return `E2E P9 Prod ${Date.now()}`;
}

test.beforeAll(() => {
  reseedE2E();
});

/** Row for the module whose slug badge is exactly `slug` (slug is unique). */
function moduleRowBySlug(page: Page, slug: string) {
  return page.locator(`tr.module-row:has(code.slug-badge:text-is("${slug}"))`);
}

/** Opens /admin/attribute-modules and creates a module via the modal. */
async function createModule(page: Page, name: string, slug: string): Promise<void> {
  await page.goto(ADMIN_URLS.attributes);
  await page.locator("#add-module").click();
  const modal = page.locator("#module-modal");
  await expect(modal).toBeVisible();
  await modal.locator('#module-form input[name="name"]').fill(name);
  await modal.locator('#module-form input[name="slug"]').fill(slug);
  await modal.locator('#module-form select[name="frontend_component"]').selectOption("dropdown");
  await modal.locator('#module-form button[type="submit"]').click();
  await expect(modal).toBeHidden();
}

/** Expands a module row and adds a value through the value modal. */
async function createValue(page: Page, moduleId: string, label: string, raw: string): Promise<void> {
  const row = page.locator(`tr.module-row[data-module-id="${moduleId}"]`);
  await row.locator(".expand-btn").click();
  const panel = page.locator(`#values-${moduleId}`);
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: "Agregar Valor" }).click();

  const vmodal = page.locator("#value-modal");
  await expect(vmodal).toBeVisible();
  await vmodal.locator('#value-form input[name="label"]').fill(label);
  await vmodal.locator('#value-form input[name="raw_value"]').fill(raw);
  await vmodal.locator('#value-form input[name="hex_color"]').fill("#123456");
  await vmodal.locator('#value-form button[type="submit"]').click();
  await expect(vmodal).toBeHidden();

  await expect(panel.locator(".value-card", { hasText: label })).toBeVisible();
}

/** Resolves a module id by slug through the admin API (shares the session). */
async function moduleIdBySlug(page: Page, slug: string): Promise<string> {
  const res = await page.request.get(`${BACKEND_URL}/api/admin/attributes/modules`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const mod = body.data.find((m: { slug: string }) => m.slug === slug);
  expect(mod, `module with slug ${slug} exists`).toBeTruthy();
  return mod.id as string;
}

/** Creates a product via the products page modal (shared with P7 pattern). */
async function createProduct(page: Page, name: string): Promise<void> {
  await page.goto(ADMIN_URLS.products);
  await page.locator("#add-product").click();
  const modal = page.locator("#modal-overlay");
  await expect(modal).toBeVisible();
  await modal.locator("#modal-name").fill(name);
  await modal.locator('input[name="basePrice"]').fill("88000");
  await modal.locator("#section-select").selectOption({ label: "Indumentaria" });
  await modal.locator("#category-select").selectOption({ label: "Remeras" });
  await modal.locator("#subcategory-select").selectOption({ label: "Algodón Pima" });
  await modal.locator("#modal-submit").click();
  await expect(modal).toBeHidden();
}

/** Opens the AttributeManager for a product and assigns a module to it. */
async function assignModule(page: Page, productName: string, moduleName: string, moduleId: string): Promise<void> {
  await page.goto(ADMIN_URLS.products);
  await page.locator("#search").fill(productName);
  const row = page.locator("tbody tr", { hasText: productName });
  await expect(row).toBeVisible();
  await row.getByTitle("Atributos").click();

  const overlay = page.locator("#attr-overlay");
  await expect(overlay).toBeVisible();
  const select = overlay.locator("#add-module-select");
  await expect(select).toContainText(moduleName);
  await select.selectOption(moduleId);
  await expect(overlay.locator(".attr-module-card", { hasText: moduleName })).toBeVisible();
  await overlay.locator("#attr-modal-cancel").click();
  await expect(overlay).toBeHidden();
}

test("lists the seeded attribute modules and their values", async ({ page }) => {
  await page.goto(ADMIN_URLS.attributes);

  // Seeded mod-color by its unique slug; the component badge shows the raw
  // stored value ("ColorSelector" — the UI label map only covers dropdowns,
  // so seeded modules fall back to the raw frontend_component value).
  const row = moduleRowBySlug(page, SEEDED_MODULE_SLUG);
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(SEEDED_MODULE_NAME);
  await expect(row.locator(".component-badge")).toHaveText("ColorSelector");
  await expect(row).toContainText("Activo");

  // Expand → seeded values render from the real API (val-negro fixed id).
  const moduleId = (await row.getAttribute("data-module-id"))!;
  await row.locator(".expand-btn").click();
  const panel = page.locator(`#values-${moduleId}`);
  await expect(panel).toBeVisible();
  const card = panel.locator(".value-card", { hasText: SEEDED_VALUE_LABEL });
  await expect(card).toBeVisible();
  await expect(card.locator(".value-raw")).toHaveText(SEEDED_VALUE_RAW);
});

test("creates an attribute module", async ({ page }) => {
  const name = uniqueModuleName();
  const slug = uniqueModuleSlug();
  await createModule(page, name, slug);

  // POST /api/admin/attributes/modules → the client-side filtered list shows
  // it. NOTE: the site Header also has an id="search-input" (catalog search),
  // so scope to the admin main area.
  await page.locator("main #search-input").fill(name);
  const row = moduleRowBySlug(page, slug);
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(name);
  await expect(row.locator(".component-badge")).toHaveText("Dropdown");
  await expect(row).toContainText("Activo");
});

test("creates a value for a module", async ({ page }) => {
  const name = uniqueModuleName();
  const slug = uniqueModuleSlug();
  await createModule(page, name, slug);
  const moduleId = (await moduleRowBySlug(page, slug).getAttribute("data-module-id"))!;

  const label = `E2E Valor ${Date.now()}`;
  const raw = `e2e-valor-${Date.now()}`;
  await createValue(page, moduleId, label, raw);

  // POST /api/admin/attributes/values → the value card renders label + raw.
  const panel = page.locator(`#values-${moduleId}`);
  const card = panel.locator(".value-card", { hasText: label });
  await expect(card.locator(".value-raw")).toHaveText(raw);
});

test("edits an attribute module", async ({ page }) => {
  const name = uniqueModuleName();
  const slug = uniqueModuleSlug();
  await createModule(page, name, slug);
  const renamed = `${name} Editado`;

  // Edit modal is prefilled with the current module data.
  const row = moduleRowBySlug(page, slug);
  await row.getByTitle("Editar").click();
  const modal = page.locator("#module-modal");
  await expect(modal).toBeVisible();
  await expect(modal.locator('#module-form input[name="name"]')).toHaveValue(name);

  // PUT /api/admin/attributes/modules/:id → renamed row appears.
  await modal.locator('#module-form input[name="name"]').fill(renamed);
  await modal.locator('#module-form button[type="submit"]').click();
  await expect(modal).toBeHidden();
  await page.locator("main #search-input").fill(renamed);
  const renamedRow = page.locator("tr.module-row", { hasText: renamed });
  await expect(renamedRow).toHaveCount(1);
  await expect(renamedRow).toContainText("Activo");
});

test("assigns and unassigns a module to a product", async ({ page }) => {
  const moduleName = uniqueModuleName();
  const moduleSlug = uniqueModuleSlug();
  await createModule(page, moduleName, moduleSlug);
  const moduleId = await moduleIdBySlug(page, moduleSlug);
  const productName = uniqueProductName();
  await createProduct(page, productName);

  // POST /api/admin/products/:id/attributes → card + product badge update.
  await assignModule(page, productName, moduleName, moduleId);
  await page.locator("#search").fill(productName);
  const row = page.locator("tbody tr", { hasText: productName });
  await expect(row.locator(".attr-badge")).toHaveText("1 módulos");

  // DELETE /api/admin/products/:id/attributes/:moduleId → card + badge reset.
  await row.getByTitle("Atributos").click();
  const overlay = page.locator("#attr-overlay");
  await expect(overlay).toBeVisible();
  page.once("dialog", (dialog) => void dialog.accept());
  await overlay
    .locator(".attr-module-card", { hasText: moduleName })
    .getByRole("button", { name: "Quitar" })
    .click();
  await expect(overlay.locator("#assigned-modules-list")).toContainText("No hay módulos asignados");
  await overlay.locator("#attr-modal-cancel").click();
  await expect(overlay).toBeHidden();
  await expect(row.locator(".attr-badge")).toHaveText("0 módulos");
});

test("creates and deletes a dependency between assigned modules", async ({ page }) => {
  // Two flow-created modules, each with one value, plus a flow-created product.
  const modAName = uniqueModuleName();
  const modASlug = uniqueModuleSlug();
  const modBName = uniqueModuleName();
  const modBSlug = uniqueModuleSlug();
  await createModule(page, modAName, modASlug);
  await createModule(page, modBName, modBSlug);
  const modAId = await moduleIdBySlug(page, modASlug);
  const modBId = await moduleIdBySlug(page, modBSlug);
  const valueALabel = `E2E Dep Valor ${Date.now()}`;
  await createValue(page, modAId, valueALabel, "e2e-dep-a");
  await createValue(page, modBId, "E2E Dep Valor B", "e2e-dep-b");

  const productName = uniqueProductName();
  await createProduct(page, productName);
  await assignModule(page, productName, modAName, modAId);
  await assignModule(page, productName, modBName, modBId);

  // Dependency button appears only with ≥2 assigned modules (UI rule).
  await page.goto(ADMIN_URLS.products);
  await page.locator("#search").fill(productName);
  const row = page.locator("tbody tr", { hasText: productName });
  await expect(row).toBeVisible();
  await row.getByTitle("Atributos").click();
  const overlay = page.locator("#attr-overlay");
  await expect(overlay).toBeVisible();
  await expect(overlay.locator("#show-dependency-btn")).toBeVisible();
  await overlay.locator("#show-dependency-btn").click();

  // POST /api/admin/attributes/dependencies (parent value A → child module B).
  const depForm = page.locator("#dep-overlay");
  await expect(depForm).toBeVisible();
  await depForm.locator("#parent-module-select").selectOption(modAId);
  await expect(depForm.locator("#parent-value-select")).toContainText(valueALabel);
  await depForm.locator("#parent-value-select").selectOption({ label: valueALabel });
  await depForm.locator("#child-module-select").selectOption(modBId);
  await depForm.locator('#dependency-form button[type="submit"]').click();
  await expect(depForm).toBeHidden();

  const depItem = overlay.locator(".attr-dep-item", { hasText: modAName });
  await expect(depItem).toBeVisible();
  await expect(depItem).toContainText("→");
  await expect(depItem).toContainText(modBName);
  await expect(depItem).toContainText("Todos");

  // DELETE /api/admin/attributes/dependencies/:id → empty state returns.
  page.once("dialog", (dialog) => void dialog.accept());
  await depItem.locator(".btn--danger").click();
  await expect(overlay.locator("#dependencies-list")).toContainText("No hay dependencias configuradas");
  await overlay.locator("#attr-modal-cancel").click();
});
