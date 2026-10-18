import { test, expect, type Page } from "@playwright/test";

/**
 * Device-project gating for form-factor-pinned e2e tests
 * (odd/tasks/e2e-device-matrix.md, S1).
 *
 * The public-surface specs run once per device project (public-mobile /
 * public-tablet / public-pc, see playwright.config.ts). Tests that assert
 * viewport-agnostic behavior inherit the project viewport and need no
 * gating. Tests that can only pass at one form factor — a hidden-below-768px
 * sidebar control, a mobile-only drawer, a desktop-only header icon — call
 * `onlyDeviceProjects(...)` so they run exactly once, on their device,
 * instead of failing (or pointlessly re-running) on the other two.
 *
 * The project names are the matrix contract: playwright.config.ts documents
 * them as referenced-from-specs, so renaming a project means updating every
 * onlyDeviceProjects call site.
 */
export const DEVICE_PROJECTS = ["public-mobile", "public-tablet", "public-pc"] as const;

export type DeviceProject = (typeof DEVICE_PROJECTS)[number];

export function onlyDeviceProjects(...names: DeviceProject[]) {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      !names.includes(testInfo.project.name as DeviceProject),
      `form-factor-pinned test: runs on ${names.join(" + ")} only (current project: ${testInfo.project.name})`
    );
  });
}

/**
 * Gate ONE test body to a device project: the per-test counterpart of
 * `onlyDeviceProjects(...)`, which gates a whole describe through beforeEach.
 *
 * Prefer this over an inline `test.skip(test.info().project.name !== "...")`.
 * The inline form compares raw strings, so a mistyped project name still
 * compiles and then skips the test in EVERY project — a silently missing
 * test, which is the one failure a green suite cannot show. Here the name is
 * part of the `DeviceProject` union, so a typo fails `tsc --noEmit`.
 */
export function onlyOnDeviceProject(name: DeviceProject, reason: string) {
  test.skip(test.info().project.name !== name, reason);
}

/**
 * Open the admin sidebar drawer the way a real small-viewport user does.
 *
 * Below the 768px breakpoint the admin sidebar is off-canvas
 * (`left: -280px`, see the SIDEBAR DRAWER section in
 * src/styles/admin-shared.css) and its links are in the DOM but never
 * visible until the `#sidebar-toggle` hamburger adds `.is-open`. A direct
 * `page.click('.sidebar-link…')` therefore times out on mobile (and on the
 * 700px tablet, which shares the same <768px drawer UI) while passing on
 * PC — the specs that assumed a desktop layout. Call this before driving
 * any `.sidebar-link` / `#deploy-btn` so the same spec runs unmodified on
 * all three device projects: above 768px the toggle is `display: none` and
 * this is a no-op.
 */
export async function ensureAdminSidebarOpen(page: Page) {
  // Auth gate (src/styles/admin-shared.css): `.admin-layout` is
  // `visibility: hidden` until requireAdminAuth() adds `.auth-ok`, so an
  // instant isVisible() right after goto false-negatives while /api/me is
  // in flight. Wait for the gate first — it clears on every form factor.
  await page.locator(".admin-layout.auth-ok").waitFor({ timeout: 15_000 });
  if (!(await page.locator("#sidebar-toggle").isVisible())) return;
  const sidebar = page.locator("#admin-sidebar");
  const isOpen = await sidebar
    .evaluate((el) => el.classList.contains("is-open"))
    .catch(() => false);
  if (!isOpen) {
    await page.locator("#sidebar-toggle").click();
    await expect(sidebar, "admin sidebar drawer must open via the hamburger toggle").toHaveClass(
      /is-open/
    );
  }
}

/**
 * Click an admin sidebar link the way a real small-viewport user does.
 *
 * The open drawer is `position: fixed; height: 100vh; overflow-y: auto`
 * with `body { overflow: hidden }` while open, so links below the fold
 * (products group, deploy button) are unreachable by page scroll:
 * Playwright's scroll-into-view scrolls the window — a no-op against the
 * locked body — and reports "element is outside of the viewport" until the
 * action times out. Scrolling the link into view inside its own drawer
 * first is the real-user gesture (a finger scroll of the drawer) and keeps
 * the assertion strength identical on every form factor.
 */
export async function clickAdminSidebarLink(page: Page, section: string) {
  await ensureAdminSidebarOpen(page);
  const link = page.locator(`.sidebar-link[data-section="${section}"]`);
  await link.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await link.click();
}
