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
// Captured once: this repo's tsconfig has no `@types/node`, so every
// `process` reference is a `tsc --noEmit` error (TS2591). One capture keeps
// the run's environment in a single, documented place.
const env = process.env;
const FRONT_PORT = env.E2E_FRONT_PORT ?? "4321";
const BACK_PORT = env.E2E_BACK_PORT ?? "8787";
const FRONT_URL = `http://localhost:${FRONT_PORT}`;
const BACK_URL = `http://localhost:${BACK_PORT}`;

// The port-parametrized backend URL must also reach the TEST process: the
// admin helpers resolve it in Node, where `import.meta.env` does not exist and
// src/lib/api-url.ts would return its hardcoded :8787 dev fallback — the WRONG
// backend under E2E_BACK_PORT. Playwright loads this config in the main
// process before it spawns any worker, so every worker inherits the value.
env.E2E_BACKEND_URL = BACK_URL;

// The backend trusts ONLY the origins listed in CORS_ORIGINS /
// TRUSTED_ORIGINS, and .dev.vars pins both to http://localhost:4321; better-auth
// validates the Origin on every POST, and the admin login IS a POST. A run moved
// to another front port must therefore hand the backend ITS OWN front origin, or
// the browser login is rejected before credentials are ever checked (the form
// never leaves /login, showing "Error de conexión"). The public surface never
// noticed: the SSG catalog is fetched server-side by astro dev, so the admin
// login is the first browser-to-backend cross-origin request in the suite.
const BACKEND_FLAGS = [
  "--var RATE_LIMIT_DISABLED:true",
  "--var ENVIRONMENT:test",
  `--var CORS_ORIGINS:${FRONT_URL}`,
  `--var TRUSTED_ORIGINS:${FRONT_URL}`,
].join(" ");

// Public-surface spec files owned by the device matrix (S1, S2). Everything
// else non-admin (responsive.spec.ts with its own internal viewport loop,
// the *-revisit SPA-wiring specs) stays on the single-run `chromium`
// project so no spec runs twice at the same viewport.
const PUBLIC_SPECS = /e2e\/(catalog|cart|wishlist|detail-volume|home)\.spec\.ts$/;

// Admin spec files owned by the authenticated device matrix (S4). The touch
// spec declares its own input context, so it runs exactly once (admin-touch)
// and the three admin device projects ignore it.
const ADMIN_SPECS = /e2e\/admin\/.*\.spec\.ts$/;
const ADMIN_TOUCH_SPEC = /promo-editor-touch\.spec\.ts$/;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: env.CI ? 2 : 0,
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
    // Authenticated device matrix (odd/tasks/e2e-device-matrix.md, S4): the
    // admin surface runs once per form factor, with the SAME viewports as the
    // public matrix above and therefore the same documented breakpoints. The
    // setup dependency guarantees the storageState exists before any flow
    // runs, so credentials are submitted exactly once per suite (spec: Single
    // login via storageState). Cross-file serialization: the `test:e2e:admin`
    // script forces --workers=1 (shared D1); each flow file additionally opts
    // into test.describe.configure({ mode: "serial" }).
    {
      name: "admin-mobile",
      testMatch: ADMIN_SPECS,
      testIgnore: ADMIN_TOUCH_SPEC,
      dependencies: ["admin-setup"],
      use: {
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
        storageState: "e2e/admin/.auth/admin.json",
      },
    },
    {
      name: "admin-tablet",
      testMatch: ADMIN_SPECS,
      testIgnore: ADMIN_TOUCH_SPEC,
      dependencies: ["admin-setup"],
      use: {
        browserName: "chromium",
        viewport: { width: 700, height: 800 },
        storageState: "e2e/admin/.auth/admin.json",
      },
    },
    {
      name: "admin-pc",
      testMatch: ADMIN_SPECS,
      testIgnore: ADMIN_TOUCH_SPEC,
      dependencies: ["admin-setup"],
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 800 },
        storageState: "e2e/admin/.auth/admin.json",
      },
    },
    {
      name: "admin-touch",
      // promo-editor-touch.spec.ts pins its OWN context with
      // test.use(TOUCH_CONTEXT) — 375x667, hasTouch, isMobile — so the project
      // viewport is irrelevant and the spec must run exactly ONCE. It stays
      // out of the device matrix (the three admin device projects ignore it)
      // for the same reason responsive.spec.ts stays on `chromium`: running a
      // self-framed spec per device would be pure duplication, not coverage.
      testMatch: ADMIN_TOUCH_SPEC,
      dependencies: ["admin-setup"],
      use: {
        browserName: "chromium",
        storageState: "e2e/admin/.auth/admin.json",
      },
    },
  ],
  webServer: [
    {
      // Invoke wrangler DIRECTLY: `pnpm run dev -- <flags>` reaches wrangler as
      // `wrangler dev -- --port … --var …`, and wrangler reads everything after
      // that inserted `--` as passthrough args for the worker, silently dropping
      // EVERY flag (verified: the resulting server answered a preflight from the
      // run's front origin with no Access-Control-Allow-Origin while :4321 — the
      // .dev.vars value — was allowed, so the browser blocked the admin login
      // POST and the form reported "Error de conexión"). The same drop disabled
      // RATE_LIMIT_DISABLED/ENVIRONMENT=test, which the suite needs.
      command: `cd ${BACKEND_DIR} && exec ./node_modules/.bin/wrangler dev --port ${BACK_PORT} ${BACKEND_FLAGS}`,
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
  reporter: env.CI ? [["junit", { outputFile: "test-results/e2e.xml" }]] : "list",
});
