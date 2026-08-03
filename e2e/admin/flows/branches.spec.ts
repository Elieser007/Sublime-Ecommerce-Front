/**
 * Admin E2E — Branches flow (tasks 2.10, design D7/D8).
 *
 * Serial per file (shared seeded D1); storageState from auth.setup (single
 * login, credentials never re-submitted). `reseedE2E()` in beforeAll re-runs
 * the deterministic Back seed so every run starts from identical rows.
 *
 * Coverage (spec "Admin Flows E2E" #7): list, create (name required — the
 * backend rejects blank names), edit, and the status toggle the UI exposes
 * (🗑️ soft delete → "Inactivo"; the branches page has NO reactivate button,
 * same "borrar si aplica" convention as P7 categories). Finding 26: the
 * seeded `branch-principal` may be MISSING on dev DBs (slug squatted by a
 * renamed dev branch), so NO test asserts it — every assertion runs against
 * a branch created by the flow itself.
 *
 * The LAST test switches the active branch through the sidebar selector.
 * POST /api/branches/switch issues a NEW session cookie and DELETES the old
 * session row (Back branches.ts), so the test re-saves the shared
 * storageState from its own context afterwards — otherwise every later test
 * would inherit a dead session token. It stays last to keep that blast
 * radius minimal.
 */
import { test, expect, type Page } from "@playwright/test";
import { ADMIN_URLS, BACKEND_URL, reseedE2E } from "../helpers";

test.describe.configure({ mode: "serial" });

/** The create/edit/delete/switch flow only ever touches its own branch. */
function uniqueBranchName(): string {
  return `E2E P9 Branch ${Date.now()}`;
}

test.beforeAll(() => {
  reseedE2E();
});

/** Opens /admin/branches and creates a branch via the modal. */
async function createBranch(page: Page, name: string, address: string, phone: string): Promise<void> {
  await page.goto(ADMIN_URLS.branches);
  await page.locator("#add-branch").click();
  const modal = page.locator("#modal-overlay");
  await expect(modal).toBeVisible();
  await modal.locator('#modal-form input[name="name"]').fill(name);
  await modal.locator('#modal-form input[name="address"]').fill(address);
  await modal.locator('#modal-form input[name="phone"]').fill(phone);
  await modal.locator('#modal-form button[type="submit"]').click();
  await expect(modal).toBeHidden();
}

/** Searches the branches table and returns the row for `name`. */
function branchRow(page: Page, name: string) {
  return page.locator("tbody tr", { hasText: name });
}

test("creates a branch and it appears in the list", async ({ page }) => {
  const name = uniqueBranchName();
  const address = "Av. E2E 1234";
  const phone = "+595 990 111 222";
  await createBranch(page, name, address, phone);

  // Persisted against the real backend: POST /api/branches → list re-query.
  await page.locator("#search").fill(name);
  const row = branchRow(page, name);
  await expect(row).toBeVisible();
  await expect(row.locator(".slug-badge")).toHaveText(/^e2e-p9-branch-\d+$/);
  await expect(row).toContainText(address);
  await expect(row).toContainText(phone);
  await expect(row).toContainText("Activo");
});

test("edits a branch name and address", async ({ page }) => {
  const name = uniqueBranchName();
  const renamed = `${name} Editado`;
  await createBranch(page, name, "Av. Original 1", "+595 990 333 444");
  await page.locator("#search").fill(name);
  let row = branchRow(page, name);
  await expect(row).toBeVisible();

  // Edit modal is prefilled with the current branch data.
  await row.getByTitle("Editar").click();
  const modal = page.locator("#modal-overlay");
  await expect(modal).toBeVisible();
  await expect(modal.locator('#modal-form input[name="name"]')).toHaveValue(name);
  await expect(modal.locator('#modal-form input[name="address"]')).toHaveValue("Av. Original 1");

  // PUT /api/branches/:id — name change regenerates the slug (backend rule).
  await modal.locator('#modal-form input[name="name"]').fill(renamed);
  await modal.locator('#modal-form input[name="address"]').fill("Av. Editada 2");
  await modal.locator('#modal-form button[type="submit"]').click();
  await expect(modal).toBeHidden();

  await page.locator("#search").fill(renamed);
  row = branchRow(page, renamed);
  await expect(row).toBeVisible();
  await expect(row).toContainText("Av. Editada 2");
  await expect(row.locator(".slug-badge")).toHaveText(/-editado$/);
});

test("deactivates a branch via the status toggle", async ({ page }) => {
  const name = uniqueBranchName();
  await createBranch(page, name, "Av. Toggle 3", "+595 990 555 666");
  await page.locator("#search").fill(name);
  let row = branchRow(page, name);
  await expect(row).toBeVisible();

  // Soft delete: DELETE /api/branches/:id + native confirm → Inactivo badge.
  page.once("dialog", (dialog) => void dialog.accept());
  await row.getByTitle("Desactivar").click();
  row = branchRow(page, name);
  await expect(row).toContainText("Inactivo");
  await expect(row.locator(".badge--inactive")).toBeVisible();
});

test("filters branches by status", async ({ page }) => {
  const name = uniqueBranchName();
  await createBranch(page, name, "Av. Filtro 4", "+595 990 777 888");
  await page.locator("#search").fill(name);
  const row = branchRow(page, name);
  await expect(row).toBeVisible();

  // "Activas" (is_active=1) keeps the created branch...
  await page.locator("#status-filter").selectOption("1");
  await expect(branchRow(page, name)).toBeVisible();

  // ..."Inactivas" (is_active=0) filters it out → real API filtering, empty.
  await page.locator("#status-filter").selectOption("0");
  await expect(branchRow(page, name)).toHaveCount(0);
  await expect(page.locator("#showing")).toHaveText("Mostrando 0 de 0");
});

test("switches the active branch via the sidebar selector", async ({ page }) => {
  const name = uniqueBranchName();
  await createBranch(page, name, "Av. Switch 5", "+595 990 999 000");

  // The sidebar selector lists the admin's ASSIGNED branches (legacy mode
  // of GET /api/branches); the creator is auto-assigned to the new branch,
  // so the flow-created branch is deterministically switchable.
  await page.goto(ADMIN_URLS.branches);
  const selector = page.locator("#branch-select");
  await expect(selector).toBeVisible();
  await expect(selector).toContainText(name);

  // Resolve the branch id through the same API the panel uses.
  const res = await page.request.get(
    `${BACKEND_URL}/api/branches?page=1&limit=25&search=${encodeURIComponent(name)}`
  );
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  const branchId = data.data[0].id as string;
  expect(branchId).toBeTruthy();

  // Select → sidebar POSTs /api/branches/switch → reload. The response
  // issues a NEW session cookie and deletes the old session row.
  await selector.selectOption({ label: name });
  await expect(page.locator("#user-name")).toHaveText("Admin Sublime", { timeout: 15_000 });

  // Persist the switched session into the shared storageState BEFORE the
  // remaining assertions, so a later failure cannot strand the suite with a
  // deleted session token.
  await page.context().storageState({ path: "e2e/admin/.auth/admin.json" });

  // The reloaded sidebar marks the switched branch as the current one.
  await expect(page.locator("#branch-select")).toHaveValue(branchId);
});
