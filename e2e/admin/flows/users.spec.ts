/**
 * Admin E2E — Users flow (tasks 2.8–2.9, design D7/D8).
 *
 * Serial per file (shared seeded D1); storageState from auth.setup (single
 * login, credentials never re-submitted). `reseedE2E()` in beforeAll re-runs
 * the deterministic Back seed so every run starts from identical rows.
 *
 * Coverage (spec "Admin Flows E2E" #4): list with role filter against the
 * seeded admin (the list is scoped to the admin's assigned branches, so the
 * admin itself is the deterministic reference user), create via the users
 * modal (password + branch assignment — a user without a branch would never
 * appear in the scoped list), edit name/role, hard delete (🗑️ + native
 * confirm), and avatar upload on create (file input → client-side canvas
 * processing → POST /api/upload → persisted avatarUrl). All mutations run
 * against users created by the flow itself; seeded fixtures are asserted by
 * email only (observation 19: never assert user-admin-e2e's id).
 */
import { test, expect, type Page } from "@playwright/test";
import { ADMIN_URLS, reseedE2E } from "../helpers";

test.describe.configure({ mode: "serial" });

/** Seeded users (Back scripts/seed-e2e.ts — fixed IDs, asserted by email). */
const SEEDED_ADMIN_NAME = "Admin Sublime";
const SEEDED_CLIENT_NAME = "Cliente E2E";
const SEEDED_CLIENT_EMAIL = "cliente-e2e@sublime.test";
const SEEDED_ADMIN_EMAIL = "admin@sublime.com";

/** 1×1 PNG — the avatar pipeline resizes ≤1000px and re-encodes to WebP. */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

/** The create/edit/delete/avatar flow only ever touches its own user. */
function uniqueUserEmail(): string {
  return `e2e-p8-user-${Date.now()}@sublime.test`;
}

function uniqueUserName(): string {
  return `E2E P8 User ${Date.now()}`;
}

test.beforeAll(() => {
  reseedE2E();
});

test("lists seeded users and filters by role", async ({ page }) => {
  await page.goto(ADMIN_URLS.users);

  // The list is scoped to the admin's assigned branches, so the deterministic
  // reference user is the seeded admin itself (always in scope). The seeded
  // client user lives in branch-principal and is only visible when the admin's
  // branch set includes it — dev-DB dependent (see apply-progress deviation 25).
  await page.locator("#search").fill(SEEDED_ADMIN_EMAIL);
  const row = page.locator("tbody tr", { hasText: SEEDED_ADMIN_EMAIL });
  await expect(row).toBeVisible();
  await expect(row).toContainText(SEEDED_ADMIN_NAME);
  await expect(row).toContainText("Admin");
  await expect(row).toContainText("Tú");

  // Role filter excludes the other role → real API filtering, empty state.
  await page.locator("#role-filter").selectOption("client");
  await expect(page.locator("tbody")).toContainText("No hay usuarios");
  await page.locator("#role-filter").selectOption("");
  await expect(row).toBeVisible();
});

/** Opens /admin/users and creates a user via the modal. */
async function createUser(page: Page, name: string, email: string): Promise<void> {
  await page.goto(ADMIN_URLS.users);
  await page.locator("#add-user").click();
  const modal = page.locator("#modal-overlay");
  await expect(modal).toBeVisible();
  await modal.locator('input[name="name"]').fill(name);
  await modal.locator('input[name="email"]').fill(email);
  await modal.locator('input[name="password"]').fill("e2e-password-123");
  await modal.locator('select[name="role"]').selectOption("client");
  // Branch assignment is required for the created user to show up: the list is
  // scoped to the admin's assigned branches and the modal offers exactly those
  // (GET /api/branches, session-scoped). Any of them works — pick the first.
  await modal.locator("#branch-ids").selectOption({ index: 0 });
  await modal.locator("#modal-form button[type='submit']").click();
  await expect(modal).toBeHidden();
}

test("creates a user and it appears in the list", async ({ page }) => {
  const name = uniqueUserName();
  const email = uniqueUserEmail();
  await createUser(page, name, email);

  // Persisted against the real backend: POST /api/users → list re-query.
  await page.locator("#search").fill(email);
  const row = page.locator("tbody tr", { hasText: email });
  await expect(row).toBeVisible();
  await expect(row).toContainText(name);
  await expect(row).toContainText("Cliente");
});

test("edits the user name and role", async ({ page }) => {
  const name = uniqueUserName();
  const email = uniqueUserEmail();
  await createUser(page, name, email);
  await page.locator("#search").fill(email);
  let row = page.locator("tbody tr", { hasText: email });
  await expect(row).toBeVisible();

  await row.getByTitle("Editar").click();
  const modal = page.locator("#modal-overlay");
  await expect(modal).toBeVisible();
  await modal.locator('input[name="name"]').fill(`${name} Editado`);
  await modal.locator('select[name="role"]').selectOption("admin");
  await modal.locator("#modal-form button[type='submit']").click();
  await expect(modal).toBeHidden();

  // PUT /api/users/:id → the reloaded list shows the new name and role.
  row = page.locator("tbody tr", { hasText: email });
  await expect(row).toContainText(`${name} Editado`);
  await expect(row).toContainText("Admin");
});

test("deletes the user", async ({ page }) => {
  const name = uniqueUserName();
  const email = uniqueUserEmail();
  await createUser(page, name, email);
  await page.locator("#search").fill(email);
  const row = page.locator("tbody tr", { hasText: email });
  await expect(row).toBeVisible();

  // Hard delete (DELETE /api/users/:id), native confirm dialog.
  page.once("dialog", (dialog) => void dialog.accept());
  await row.getByTitle("Eliminar").click();
  await expect(page.locator("tbody tr", { hasText: email })).toHaveCount(0);
});

test("uploads an avatar when creating a user", async ({ page }) => {
  const name = uniqueUserName();
  const email = uniqueUserEmail();
  await page.goto(ADMIN_URLS.users);
  await page.locator("#add-user").click();
  const modal = page.locator("#modal-overlay");
  await expect(modal).toBeVisible();

  // File input → client-side canvas processing → preview before save.
  await modal.locator("#avatar-input").setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: PNG_1X1,
  });
  await expect(modal.locator("#avatar-image")).toBeVisible();

  await modal.locator('input[name="name"]').fill(name);
  await modal.locator('input[name="email"]').fill(email);
  await modal.locator('input[name="password"]').fill("e2e-password-123");
  await modal.locator('select[name="role"]').selectOption("client");
  await modal.locator("#branch-ids").selectOption({ index: 0 });
  await modal.locator("#modal-form button[type='submit']").click();
  await expect(modal).toBeHidden();

  // POST /api/upload (dev proxy) → avatarUrl persisted → row renders <img>.
  await page.locator("#search").fill(email);
  const row = page.locator("tbody tr", { hasText: email });
  await expect(row).toBeVisible();
  const avatar = row.locator("img.user-avatar");
  await expect(avatar).toBeVisible();
  await expect(avatar).toHaveAttribute("src", /\/api\/upload\//);
});
