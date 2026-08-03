/**
 * Admin E2E — Orders flow (tasks 2.8–2.9, design D7/D8).
 *
 * Serial per file (shared seeded D1); storageState from auth.setup (single
 * login, credentials never re-submitted). `reseedE2E()` in beforeAll re-runs
 * the deterministic Back seed so every run starts from identical rows —
 * REQUIRED here: the status transition tests mutate the seeded orders, and
 * only the reseed makes the runs repeatable (P7 risk note).
 *
 * Coverage (spec "Admin Flows E2E" #5): list with search + status filter
 * against the seeded orders (ord-e2e-1..3), the detail view with items and
 * totals, the full status state machine walk on ord-e2e-1 (pending →
 * confirmed → preparing → shipped → delivered, with a note persisted
 * mid-walk), and the cancel path on ord-e2e-2 (confirmed → cancelled).
 * Rows are located by customer name: the table renders a short id badge
 * (ord-e2e-), never the full id.
 */
import { test, expect, type Page } from "@playwright/test";
import { ADMIN_URLS, reseedE2E } from "../helpers";

test.describe.configure({ mode: "serial" });

/** Seeded orders (Back scripts/seed-e2e.ts, fixed IDs ord-e2e-1..3). */
const ORDER_1 = {
  id: "ord-e2e-1",
  customer: "María Pérez",
  email: "maria@example.com",
  phone: "+595 981 111 222",
  notes: "Pedido e2e pendiente",
  total: "₲ 235.000",
  statusLabel: "Pendiente",
};
const ORDER_2 = { id: "ord-e2e-2", customer: "Juan López", statusLabel: "Confirmado" };

test.beforeAll(() => {
  reseedE2E();
});

test("lists seeded orders and filters by status", async ({ page }) => {
  await page.goto(ADMIN_URLS.orders);

  // Search matches id (placeholder: "cliente, email o ID").
  await page.locator("#search").fill(ORDER_1.id);
  const row = page.locator("tbody tr", { hasText: ORDER_1.customer });
  await expect(row).toBeVisible();
  await expect(row).toContainText(ORDER_1.total);
  await expect(row).toContainText(ORDER_1.statusLabel);

  // Status filter + fixed-id search → real filtering: a confirmed order does
  // not match a pending filter (empty state), and vice versa. The page has a
  // second (hidden) tbody in the detail modal, so scope to the list table.
  await page.locator("#search").fill(ORDER_2.id);
  await page.locator("#status-filter").selectOption("pending");
  await expect(page.locator("tbody").first()).toContainText("No hay pedidos");
  await page.locator("#status-filter").selectOption("confirmed");
  const row2 = page.locator("tbody tr", { hasText: ORDER_2.customer });
  await expect(row2).toBeVisible();
  await expect(row2).toContainText(ORDER_2.statusLabel);
});

test("shows order detail with items and totals", async ({ page }) => {
  await page.goto(ADMIN_URLS.orders);
  await page.locator("#search").fill(ORDER_1.id);
  const row = page.locator("tbody tr", { hasText: ORDER_1.customer });
  await expect(row).toBeVisible();
  await row.getByTitle("Ver").click();

  const modal = page.locator("#modal-overlay");
  await expect(modal).toBeVisible();
  await expect(modal.locator("#detail-customer")).toHaveText(ORDER_1.customer);
  await expect(modal.locator("#detail-phone")).toHaveText(ORDER_1.phone);
  await expect(modal.locator("#detail-email")).toHaveText(ORDER_1.email);
  // NOTE: #detail-branch is intentionally NOT asserted — branch-principal may
  // be missing from dev DBs where another row squats the unique 'principal'
  // slug (seed INSERT OR IGNORE skips it), so the join renders "—" (finding 26).
  await expect(modal.locator("#detail-total")).toHaveText(ORDER_1.total);
  await expect(modal.locator("#detail-notes")).toHaveText(ORDER_1.notes);
  // 2 seeded line items with the known catalog product.
  await expect(modal.locator("#detail-items tr")).toHaveCount(2);
  await expect(modal.locator("#detail-items")).toContainText("Remera Sublime Básica Algodón");
  // Current status pre-selected; only the allowed transitions are offered.
  await expect(modal.locator("#status-select")).toHaveValue("pending");
  await expect(modal.locator("#status-select option")).toHaveText([
    "Pendiente (actual)",
    "Confirmado",
    "Cancelado",
  ]);
});

test("advances ord-e2e-1 through the full status state machine", async ({ page }) => {
  await page.goto(ADMIN_URLS.orders);
  await page.locator("#search").fill(ORDER_1.id);

  // pending → confirmed → preparing → shipped → delivered (UI transitions).
  const steps = [
    { from: "pending", to: "confirmed", label: "Confirmado" },
    { from: "confirmed", to: "preparing", label: "Preparando" },
    { from: "preparing", to: "shipped", label: "Enviado" },
    { from: "shipped", to: "delivered", label: "Entregado" },
  ] as const;

  for (const step of steps) {
    const row = page.locator("tbody tr", { hasText: ORDER_1.customer });
    await expect(row).toBeVisible();
    await row.getByTitle("Ver").click();
    const modal = page.locator("#modal-overlay");
    await expect(modal).toBeVisible();
    await expect(modal.locator("#status-select")).toHaveValue(step.from);

    // Persist a note once, mid-walk; PUT /api/orders/:id carries {status, notes}.
    if (step.to === "preparing") {
      await modal.locator("#notes-input").fill("Nota e2e P8");
    }
    await modal.locator("#status-select").selectOption(step.to);
    await modal.locator("#status-form button[type='submit']").click();
    await expect(modal).toBeHidden();
    await expect(row).toContainText(step.label);
  }

  // Terminal state: delivered offers no further transitions and keeps the note.
  const row = page.locator("tbody tr", { hasText: ORDER_1.customer });
  await row.getByTitle("Ver").click();
  const modal = page.locator("#modal-overlay");
  await expect(modal).toContainText("Entregado (actual)");
  await expect(modal.locator("#status-select option")).toHaveCount(1);
  await expect(modal.locator("#detail-notes")).toHaveText("Nota e2e P8");
});

test("cancels a confirmed order", async ({ page }) => {
  await page.goto(ADMIN_URLS.orders);
  await page.locator("#search").fill(ORDER_2.id);
  const row = page.locator("tbody tr", { hasText: ORDER_2.customer });
  await expect(row).toBeVisible();
  await expect(row).toContainText(ORDER_2.statusLabel);

  await row.getByTitle("Ver").click();
  const modal = page.locator("#modal-overlay");
  await expect(modal).toBeVisible();
  await expect(modal.locator("#status-select")).toHaveValue("confirmed");
  await modal.locator("#status-select").selectOption("cancelled");
  await modal.locator("#status-form button[type='submit']").click();
  await expect(modal).toBeHidden();
  await expect(page.locator("tbody tr", { hasText: ORDER_2.customer })).toContainText(
    "Cancelado"
  );
});
