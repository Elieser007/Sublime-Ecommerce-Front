# Feature: device matrix for the frontend e2e suite (mobile / tablet / PC)

Status: planned — public surface first
Owner: orchestrator + user

## Why

`playwright.config.ts` declares three projects (`chromium`, `admin-setup`,
`admin`) and **no viewport or device matrix**: every spec runs once, in
Chromium's default desktop viewport. Responsive behaviour is only covered
indirectly — one heavy `e2e/responsive.spec.ts` (20s retry budget) plus unit
tests that assert CSS text (`admin-responsive-css.test.ts`,
`catalog-mobile-ux.test.ts`, `product-card-styles.test.ts`). Nothing in the
suite renders a page at a mobile or tablet form factor, so a regression that
only breaks below 768px can land green.

The suite also cannot currently run here at all: ports 4321 and 8787 are held by
a Magic-Ecommerce wrangler/astro pair (alive >1 day, cwd
`Magic-Ecommerce-Back`/`Magic-Ecommerce-Front`) and the config uses
`reuseExistingServer: false`, so the webServers fail to start.

## Specs

- **S1 (verbatim)** — "asi aseguramos que funcione perfecto en mobil, tablet y PC".
  The e2e suite must verify the frontend in the three form factors explicitly:
  mobile, tablet and PC. A single desktop project does not satisfy it.
- **S2 (verbatim)** — "Matriz de devices, público primero". Order of work: the
  public surface first; admin/authenticated surfaces after.
- **S3 (verbatim)** — "puedes montarlo en otros puertos no usados? ese lo estoy usando yo".
  The e2e run must not use ports 4321/8787 and must not stop or disturb those
  processes; it must run on free, configurable ports.
- **S4 (verbatim)** — "hazlo completamente para todo el frontend para todo el sistema".
  End state of the program: the whole system in the three form factors — public
  (home, catalog, detail, cart, wishlist) plus admin/auth.

Not user requirements, only the evidence base for the concrete numbers: the
repo's own documented breakpoints (`AGENTS.md`: 640px tablet, 768px desktop,
1024px large desktop, 16px mobile margins).

## Tasks

| ID | Task | Specs | Route | Commit |
|----|------|-------|-------|--------|
| T1 | Parametrize the e2e servers/URLs (free ports, defaults preserved) in `playwright.config.ts`; document the runbook | S3 | worker | C1 (this slice) |
| T2 | Add the device projects (mobile / tablet / PC) to `playwright.config.ts` | S1 | worker | C1 (this slice) |
| T3 | Make the public specs viewport-aware: home/catalog, detail, cart, wishlist | S1, S2 | worker | C1 (this slice) |
| T4 | Run the public surface on the three devices, stabilize, capture evidence | S1 | worker + verify | C1 (this slice) |
| T5 | Admin + auth surfaces on the three devices | S4 | next iteration | — |
| T6 | Update `AGENTS.md` (E2E section) and the config comments for the matrix | S1, S2 | worker | C1 (this slice) |

Status: T1–T4 and T6 landed in one slice (ports + matrix + specs are interlocked in
`playwright.config.ts`, so they ship together). T5 is the remaining iteration.

## Log

- **L1 (user, verbatim)** — "a, y sigue despues haciendo todos los tests, hazlo
  completamente para todo el frontend para todo el sistema, asi aseguramos que
  funcione perfecto en mobil, tablet y PC"
- **L2 (user, decisions)** — scope: "Matriz de devices, público primero";
  ports: "puedes montarlo en otros puertos no usados? ese lo estoy usando yo";
  tooling: "sdd ya no usamos de ninguna manera, todo es odd y puedes usar el
  mimo-v2.5 de litellm para poder usae el GGA".
- **L3 (evidence, prior slice)** — shared unit-test browser environment landed on
  `test/shared-browser-env`: `test/browser-env.ts` + `test/setup.ts` +
  `setupFiles`; suite 72/1358 → 73/1361 green, `tsc --noEmit` 274 → 273 (0 new).
- **L7 (evidence, independent verification)** — `gentle-ai-verify` over this slice:
  C1 coverage preservation PASS (153 distinct identities before = 73 chromium + 80;
  after = 73 chromium + 80 shared by the three device projects; every identity runs in
  ≥1 project, none missing); C2 gating names PASS (all 14 gate sites reference existing
  projects); C3 skip distribution PASS (no spec skipped everywhere); C4 ports: env
  overrides wired, but a plain default run still targets 4321/8787 and therefore
  collides with the servers the user keeps there — run with
  `E2E_FRONT_PORT=4322 E2E_BACK_PORT=8788`; C6 docs PASS. Two follow-ups recorded:
  (a) C4 also caught an unmotivated flag change `--var ENVIRONMENT=test` (wrangler
  documents `KEY:VALUE`) — reverted to `--var ENVIRONMENT:test` before committing;
  (b) the 7 inline `test.skip(test.info().project.name !== "<literal>")` sites are
  untyped string literals, so a future project rename would skip them silently —
  route them through the typed gate. C5's "out-of-scope files touched" finding is a
  false positive: `.gga`, `.gga.bak-20260927` and `openspec/config.yaml` were already
  dirty before this slice existed and no worker touched them.
- **L4 (evidence, environment)** — the GGA pre-commit hook was blocked by
  `~/.config/opencode/opencode.json`, which referenced 11 missing files under
  `./prompts/sdd/`. 24 `sdd-*` agents removed (0 broken refs left, 17 agents
  remain, backup `opencode.json.bak-sdd-removal-20261018025409`). `astro check`
  is unusable here ("does not currently support TypeScript 7.0", exit 0) —
  `tsc --noEmit` is the type A/B.
- **L5 (evidence, T1–T4 public matrix, 2026-10-18)** — ports via `E2E_FRONT_PORT` /
  `E2E_BACK_PORT` (defaults 4321/8787 preserved); astro dev gets the backend port through
  `webServer.env.PUBLIC_API_URL` (astro.config merges process.env over .env, no .env edit).
  Device projects: `public-mobile` 375x812, `public-tablet` 700x800, `public-pc` 1280x800
  (CSS regimes <640 / 640–768 / >=1024 from global.css, index.astro, Header.astro; viewport-only,
  no touch emulation). `chromium` keeps the viewport-independent specs (responsive self-loops 4
  viewports, *-revisit SPA-wiring). Public specs: agnostic tests inherit the project viewport;
  form-factor-pinned tests declare it via new `e2e/device-gate.ts` (desktop sidebar/search/tree
  → public-pc; drawers/back-button → public-mobile; tablet drawer shares the <768px UI so its
  interaction path is covered by the mobile-pinned tests; Empty State drives
  #mobile-search-bar-input below 768px). Runs on E2E_FRONT_PORT=4322/E2E_BACK_PORT=8788 after
  `pnpm run db:migrate && pnpm run seed:e2e`: public-pc 55 passed/25 skipped/0 failed (1.1m),
  public-mobile 62 passed/18 skipped/0 failed (1.8m), public-tablet 39 passed/41 skipped/0 failed
  (55.3s), chromium 73 passed/0 failed (2.4m). Two earlier tablet runs died on
  `net::ERR_CONNECTION_REFUSED` at :4322 (astro daemon gone mid-run, backend 8788 healthy) —
  infra flake in the daemon lifecycle, not a spec failure; identical code went green on retry.
  Operational caveat: chain runs with `npx astro dev stop` + a free-port check first — teardown's
  `dev stop` can race a rapidly chained next boot (stale daemon + reuseExistingServer:false
  refuses to boot), and a single 4-project invocation was aborted mid-way ("49 did not run")
  with its output lost, so per-project runs are the evidence of record.
- **L8 (evidence, webServer foreground fix, 2026-10-18)** — the daemon keep-alive wrapper in
  `playwright.config.ts` is replaced by a foreground server: Astro 7 auto-daemonizes only when
  `am-i-vibing` detects an agent (`wantsBackground = flags.background ||
  supportsAgentAutoBackgrounding(platform) && agentDetected && !ignoreLock`,
  `astro/dist/cli/dev/index.js`), and `--ignore-lock` is the documented foreground opt-out
  ("Run the dev server in the foreground to use --ignore-lock" — verified: CLI blocks, SIGTERM
  frees the port, no daemon left). The entry is now `exec ./node_modules/.bin/astro dev --port
  … --ignore-lock` after the backend-products readiness gate; `exec` gives Playwright the astro
  process directly, so a crash fails loudly and teardown kills exactly this run's server. Chained
  evidence on `E2E_FRONT_PORT=4322/E2E_BACK_PORT=8788`, no manual cleanup between invocations:
  public-mobile exit 0, 62 passed/18 skipped; public-tablet first attempt exit 1, 35 passed/41
  skipped (4 failures, names not captured — evidence-logging gap, suspected 4×30s timeouts from
  its 2.0m duration vs 59.3s on retry), retry exit 0, 39 passed/41 skipped; public-pc exit 0, 55
  passed/25 skipped (wrangler "Broken pipe" log noise only); chromium exit 0, 73 passed. After
  every project `ss -ltn` showed 4322/8788 free and the user's 4321/8787 listeners untouched.
  AGENTS.md's stale-daemon `dev stop` caveat is retired (pre-boot `dev stop` remains in the entry
  only to clear daemons left by the old wrapper).
- **L6 (finding, needs user decision — NOT fixed)** — no responsive/rendering defect found at any
  form factor; all three devices render the public surface green. Deliberate (not defects):
  `#wishlist-btn` hidden <768px, sidebar/search-form hidden <768px (gated tests document this).
  For T5: `e2e/admin/flows/promotions.spec.ts:373,392` hardcode `http://localhost:8787` and
  `e2e/admin/helpers.ts` `getApiUrl()` falls back to 8787 under Node — admin on custom ports needs
  the same env treatment.
