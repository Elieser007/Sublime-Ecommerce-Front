import { defineConfig } from "@playwright/test";

// Backend repo, relative to this config file (Playwright runs webServer
// commands from the config directory).
const BACKEND_DIR = "../Sublime-Ecommerce-Back";
// The admin backend MUST run with the rate-limit bypass (P4 double opt-in:
// RATE_LIMIT_DISABLED=true AND ENVIRONMENT=test) or the suite trips the
// login/upload/deploy limits. reuseExistingServer:false is intentional — a
// manually started backend lacks these flags, so :8787 must be free.
// Runbook (Back repo, once): pnpm run db:migrate && pnpm run seed:e2e
// (deterministic fixed-ID seed, task 2.2); the webServer boots `wrangler dev`
// against that seeded local D1.
const BACKEND_FLAGS = "--var RATE_LIMIT_DISABLED:true --var ENVIRONMENT:test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:4321",
    headless: true,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      // Existing public/catalog/cart/responsive specs stay untouched; the
      // admin directory runs in its own projects below (auth.setup.ts must
      // not run twice, and admin flows reuse the saved storageState).
      testIgnore: /e2e\/admin\//,
      use: { browserName: "chromium" },
    },
    {
      name: "admin-setup",
      testMatch: /auth\.setup\.ts$/,
      use: { browserName: "chromium" },
    },
    {
      name: "admin",
      // Specs under e2e/admin (flows land in P7–P9). The setup dependency
      // guarantees the storageState exists before any flow runs, so
      // credentials are submitted exactly once per suite (spec: Single login
      // via storageState). Cross-file serialization: the `test:e2e:admin`
      // script forces --workers=1 (shared D1); each flow file additionally
      // opts into test.describe.configure({ mode: "serial" }).
      testMatch: /e2e\/admin\/.*\.spec\.ts$/,
      dependencies: ["admin-setup"],
      use: {
        browserName: "chromium",
        storageState: "e2e/admin/.auth/admin.json",
      },
    },
  ],
  webServer: [
    {
      command: `cd ${BACKEND_DIR} && pnpm run dev -- ${BACKEND_FLAGS}`,
      url: "http://localhost:8787/",
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      // Astro 7's `astro dev` DAEMONIZES by default: the CLI process exits as
      // soon as the background server is up, which breaks Playwright's
      // webServer keep-alive contract ("Process from config.webServer exited
      // early"). This wrapper keeps a foreground process alive while the
      // daemon serves and stops any stale daemon on teardown — so evidence
      // can never run against a previous compile again (verify F2).
      //
      // Readiness gate (verify F3): `astro dev` compiles product pages on
      // first request; if the backend isn't up yet, getStaticPaths caches an
      // EMPTY catalog and every /producto/:slug 404s for the whole run. The
      // wrapper waits for the public products API before booting Astro.
      command:
        `bash -c 'npx astro dev stop >/dev/null 2>&1; until curl -sf "http://localhost:8787/api/public/products?limit=1" -o /dev/null; do sleep 1; done; trap "npx astro dev stop >/dev/null 2>&1" EXIT TERM INT; npx astro dev >/dev/null 2>&1; while curl -sf http://localhost:4321 -o /dev/null; do sleep 2; done'`,
      url: "http://localhost:4321",
      // Always boot a fresh Astro daemon: a reused server may serve compiled
      // pages from an earlier session (the invalid 104/104 evidence in P12).
      reuseExistingServer: false,
      timeout: 90_000,
    },
  ],
  reporter: process.env.CI ? [["junit", { outputFile: "test-results/e2e.xml" }]] : "list",
});
