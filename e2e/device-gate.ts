import { test } from "@playwright/test";

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
