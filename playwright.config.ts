import { defineConfig } from "@playwright/test";

// Backend repo, relative to this config file (Playwright runs webServer
// commands from the config directory).
const BACKEND_DIR = "../Sublime-Ecommerce-Back";
// The admin backend MUST run with the rate-limit bypass (P4 double opt-in:
// RATE_LIMIT_DISABLED=true AND ENVIRONMENT=test) or the suite trips the
// login/upload/deploy limits. reuseExistingServer:false is intentional — a
// manually started backend lacks these flags.
// Runbook (Back repo, once): pnpm run db:migrate && pnpm run seed:e2e
// (deterministic fixed-ID seed, task 2.2); the webServer boots `wrangler dev`
// against that seeded local D1.
const BACKEND_FLAGS = "--var RATE_LIMIT_DISABLED:true --var ENVIRONMENT:test";

// E2E port parametrization (odd/tasks/e2e-device-matrix.md, S3): ports
// 4321/8787 are the defaults, so a plain `pnpm exec playwright test` behaves
// exactly as before — but when those ports are held by another project the
// whole matrix moves without touching this file:
//   E2E_FRONT_PORT=4322 E2E_BACK_PORT=8788 pnpm exec playwright test
// The astro dev server MUST be told the backend port explicitly: the frontend
// reads import.meta.env.PUBLIC_API_URL with a hardcoded
// http://localhost:8787 fallback (src/lib/api-url.ts DEV_FALLBACK), so the
// frontend webServer below injects PUBLIC_API_URL into astro dev's
// environment (astro.config.mjs spreads process.env over .env, so the
// injected value wins without touching .env).
const FRONT_PORT = process.env.E2E_FRONT_PORT ?? "4321";
const BACK_PORT = process.env.E2E_BACK_PORT ?? "8787";
const FRONT_URL = `http://localhost:${FRONT_PORT}`;
const BACK_URL = `http://localhost:${BACK_PORT}`;

// Public-surface spec files owned by the device matrix (S1, S2). Everything
// else non-admin (responsive.spec.ts with its own internal viewport loop,
// the *-revisit SPA-wiring specs) stays on the single-run `chromium`
// project so no spec runs twice at the same viewport.
const PUBLIC_SPECS = /e2e\/(catalog|cart|wishlist|detail-volume|home)\.spec\.ts$/;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: FRONT_URL,
    headless: true,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      // Single-run project: specs that are viewport-independent or carry
      // their own internal viewport loop. responsive.spec.ts renders its own
      // four viewports (mobileSE/mobile14/tablet/desktop) and the
      // *-revisit specs assert SPA JS wiring (not layout, marked
      // test.slow()) — running any of them per-device would be pure
      // duplication. testIgnore keeps the public-surface files on the
      // device projects below.
      testIgnore: [/e2e\/admin\//, PUBLIC_SPECS],
      use: { browserName: "chromium" },
    },
    // Device matrix (odd/tasks/e2e-device-matrix.md, S1): the PUBLIC surface
    // runs once per form factor. Viewports follow the repo's own documented
    // breakpoints (AGENTS.md + global.css / index.astro / Header.astro):
    //   public-mobile  375x812   < 640px     1-column grid, drawers,
    //                                          hamburger, 16px mobile margins
    //   public-tablet  700x800   in [640,768) 2-column grid (min-width:640px)
    //                                          + mobile drawer UI (< 768px);
    //                                          matches cart.spec.ts's own
    //                                          "Tablet" pin
    //   public-pc      1280x800  >= 1024px    auto-fill grid, sidebar, full
    //                                          header (--max-width:1280px;
    //                                          responsive.spec.ts's Desktop)
    // Viewport-only on purpose: no isMobile/hasTouch emulation, so the CSS
    // media-query regimes are deterministic without input-emulation flake in
    // the overlay/backdrop click tests. Viewport-agnostic specs inherit the
    // project viewport and run once per device with no file duplication;
    // form-factor-pinned tests declare their project via
    // e2e/device-gate.ts (the matrix contract: these project names are
    // referenced from spec files, do not rename without updating them).
    {
      name: "public-mobile",
      testMatch: PUBLIC_SPECS,
      use: { browserName: "chromium", viewport: { width: 375, height: 812 } },
    },
    {
      name: "public-tablet",
      testMatch: PUBLIC_SPECS,
      use: { browserName: "chromium", viewport: { width: 700, height: 800 } },
    },
    {
      name: "public-pc",
      testMatch: PUBLIC_SPECS,
      use: { browserName: "chromium", viewport: { width: 1280, height: 800 } },
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
      command: `cd ${BACKEND_DIR} && pnpm run dev -- --port ${BACK_PORT} ${BACKEND_FLAGS}`,
      url: `${BACK_URL}/`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      // Astro 7 AUTO-DAEMONIZES under agent environments: dev/index.js
      // computes `wantsBackground = flags.background ||
      // supportsAgentAutoBackgrounding(platform) && agentDetected &&
      // !ignoreLock` where agentDetected comes from am-i-vibing's
      // detectAgenticEnvironment() — true inside this harness, so a bare
      // `astro dev` spawns a detached daemon and the CLI exits at once.
      // The previous wrapper worked around that daemon with a curl
      // keep-alive loop (exited 0 when the daemon died, so Playwright kept
      // testing a dead server) plus a stop-trap (did not always fire, so a
      // zombie daemon held the port for the next project).
      // `--ignore-lock` is the documented foreground opt-out ("Run the dev
      // server in the foreground to use --ignore-lock"): it forces the
      // direct `devServer()` path with no lockfile and no spawned daemon
      // (verified: the CLI process blocks and SIGTERM frees the port with
      // nothing left behind). Playwright therefore owns the server process:
      // a crash fails the webServer contract loudly, and teardown kills
      // exactly this run's server — projects chain with no zombie cleanup.
      //
      // Readiness gate (verify F3): `astro dev` compiles product pages on
      // first request; if the backend isn't up yet, getStaticPaths caches an
      // EMPTY catalog and every /products/:slug 404s for the whole run. The
      // shell waits for the public products API before exec'ing Astro
      // (Playwright's `timeout` below bounds the wait). `exec` replaces the
      // shell so signals go straight to Astro. Pre-boot `dev stop` clears
      // daemons left by the old wrapper; this entry never creates one.
      //
      // PUBLIC_API_URL is injected via webServer `env` (see note above):
      // astro.config.mjs merges process.env over .env, so the dev server
      // compiles pages against this run's backend port.
      command:
        `bash -c 'npx astro dev stop >/dev/null 2>&1; until curl -sf "${BACK_URL}/api/public/products?limit=1" -o /dev/null; do sleep 1; done; exec ./node_modules/.bin/astro dev --port ${FRONT_PORT} --ignore-lock'`,
      url: FRONT_URL,
      env: { PUBLIC_API_URL: BACK_URL },
      // Always boot a fresh Astro server: a reused server may serve compiled
      // pages from an earlier session (the invalid 104/104 evidence in P12).
      reuseExistingServer: false,
      timeout: 90_000,
    },
  ],
  reporter: process.env.CI ? [["junit", { outputFile: "test-results/e2e.xml" }]] : "list",
});
