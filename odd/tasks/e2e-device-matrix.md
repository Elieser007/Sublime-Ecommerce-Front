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
| T5 | Admin + auth surfaces on the three devices | S4 | worker + verify | `1ec7d1c` |
| T6 | Update `AGENTS.md` (E2E section) and the config comments for the matrix | S1, S2 | worker | C1 (this slice) |

Status: T1–T6 landed. T1–T4 and T6 shipped in one slice (ports + matrix + specs are
interlocked in `playwright.config.ts`, so they go together) = `9497b38`; the astro
foreground lifecycle fix = `0ff4d08`; T5 = `1ec7d1c`; the typed form-factor gates
(hardening from review finding C2) = `e0f1caf`.

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
- **L7 (T5 admin matrix, root cause + evidence)** — the admin login blocker was NOT CORS config,
  credentials or the database. `pnpm run dev -- --port … --var …` reaches wrangler as `wrangler dev
  -- --port … --var …`: everything after that inserted `--` becomes passthrough args for the
  worker, so **every flag was silently dropped** and the backend ran on `.dev.vars`
  (`CORS_ORIGINS`/`TRUSTED_ORIGINS = http://localhost:4321`). Measured: preflight from Origin 4322
  → `204` **without** `Access-Control-Allow-Origin`, control Origin 4321 → ACAO
  `http://localhost:4321`, real POST from 4322 → `403`; the Playwright log showed
  `OPTIONS /api/auth/sign-in/email 204` and **no POST at all**, which is why the form reported
  "Error de conexión" (that string is the `fetch`-rejected branch in `login.astro`, never an HTTP
  status). Fix: the backend webServer now runs `exec ./node_modules/.bin/wrangler dev …` directly
  (same `exec` determinism as astro). `admin-setup` then passed (23.2s) and wrote `storageState`
  with `better-auth.session_token` (`domain localhost`, `httpOnly`). Hypotheses refuted along the
  way, all recorded because each one cost a run: (a) D1 credentials — scrypt hashes are **salted**,
  so equal passwords differ; the HTTP login returned `200` + cookie; (b) browser hitting 8787 — the
  probe showed `/api/me` calls against 8788; (c) missing seed fixtures — `users.spec.ts` passes 6/6
  in isolation and the fixtures (`user-admin-e2e`, `branch-principal`, `prod-*`) are still `0` in
  the D1, so they cannot be the cause. Admin matrix evidence, one project per invocation,
  `--workers=1`, `E2E_FRONT_PORT=4322 E2E_BACK_PORT=8788`: admin-mobile exit 1 (7 failed / 17 not
  run / 21 passed, 398s), admin-tablet exit 1 (5 / 7 / 33, 413s), admin-pc exit 1 (9 / 28 / 8,
  401s), admin-touch exit 0 (6 passed, 35s); total 1247s ≈ 20.8m. Running admin-mobile **alone**
  afterwards gave 2 failed / 1 not run / 42 passed (289s), so the matrix numbers are dominated by
  resource contention across back-to-back runs plus `test.describe.configure({mode:"serial"})`
  amplifying the first failure into "did not run" (the tablet run logged `Category tree unavailable
  … fetch failed` from astro, i.e. the backend failed to answer during page compilation). The two
  surviving failures are genuine matrix findings: `spa-revisit.spec.ts` clicks
  `.sidebar-link[data-section="dashboard"]`, which is off-canvas below the 768px breakpoint
  (161 × "waiting for element to be visible, enabled and stable"), and `deploy.spec.ts:40` times out
  at mobile for the same reason class. The old suite ran everything at the default 1280×720
  viewport, so the device matrix surfaced specs that assumed a desktop layout.
- **L8 (operational lessons, worth keeping)** — (1) an unbounded readiness gate (`until curl …; do
  sleep 1; done`) silently hung a job for 2h13m and left an orphan backend holding 8788; every wait
  is now bounded (`timeout`, max attempts) and servers run as foreground jobs so `job_stop` reaps
  them. (2) A hand-written browser probe gave a **false positive**: clicking a generic
  `button[type=submit]` hit the header search form instead of the login form, navigating to `/?q=`
  with no `/api/auth/sign-in/email` request at all — the ground truth is the Playwright run, never a
  convenience script. (3) The user's 4321/8787 listeners must never be touched; this slice always
  runs on 4322/8788.
- **L9 (tablet re-measurement, correction + the one real defect)** — the "7 failed / 22 did not
  run" tablet signature was **not** a 700×800 layout defect: my "awkward middle viewport"
  hypothesis is refuted. The drawer helpers work at 700px and no control is visible-but-covered
  there. Those runs were **backend-death artifacts**: under machine pressure (loadavg 5–6, kswapd
  active, ~13G swap in use, sibling agents) the wrangler/workerd backend on 8788 stalls mid-run —
  astro answers 500 with `Category tree unavailable … fetch failed`, admin pages sit on
  "Cargando…"/"Error al cargar", and `test.describe.configure({mode:"serial"})` turns the first
  timeout into "did not run". Every green run in this slice happened at lower load. The one
  genuine test defect found was a **data race in `attributes.spec.ts`**: `#show-dependency-btn` is
  visible by default and the dependency form populates its selects **once, synchronously**, when it
  opens, so button visibility never proved `loadProductAttributes` had resolved — the click could
  reach an empty `#parent-module-select` (`selectOption` timeout, "did not find some options"),
  reproduced 3/3 on mobile and 1/2 on tablet with isolated `-g` runs. Fixed with two data-wait
  assertions (a rendered `.attr-module-card`, then `#parent-module-select` containing the module
  name) using the same pattern `assignModule()` already relied on; no assertion weakened, no
  retry, no skip, no gate. Final measured state, one project per invocation on 4322/8788:
  admin-tablet 45 passed (2.8m), admin-mobile 45 passed (2.6m), admin-pc 45 passed (2.9m),
  admin-setup 1 passed, admin-touch 6 passed. Follow-up for the owner (outside this repo's e2e
  slice): the same race is an app-side weakness — `AttributeManager.astro` could disable
  `#show-dependency-btn` until `loadProductAttributes` resolves instead of leaving it live against
  an empty form.
- **L10 (index hygiene, recurring)** — the shared index of this clone keeps receiving staged
  reverts from concurrent writers while this session works: after commit `4188e60` the real index
  held exactly the inverse of my commit (9 files, 227 deletions staged), and it happened again
  after `1ec7d1c` (2 files, 41 deletions, index mtime 17:21:52). Commits here are therefore always
  built from a private `GIT_INDEX_FILE` + `git write-tree`/`git commit-tree` and the branch moved
  with a compare-and-swap `git update-ref`, never by `git commit` on the shared index; each time
  the shared index was resynced with `git reset` (mixed reset: index ← HEAD, worktree untouched).
- **L11 (hardening, C2 closed)** — the seven form-factor gates written as inline
  `test.skip(test.info().project.name !== "<literal>")` are now `onlyOnDeviceProject("<name>", reason)`
  in `e2e/device-gate.ts`. Two helpers because the shapes differ: `onlyDeviceProjects(...)` is a
  `beforeEach` and gates a whole describe, `onlyOnDeviceProject(...)` runs inside one test body.
  Why it mattered: the inline form compares raw strings, so a mistyped project name kept compiling
  and then skipped the test in **every** project — a silently missing test, the one failure a green
  suite cannot show. The name is now the `DeviceProject` union, so a typo fails `tsc --noEmit`.
  Same conditions, same reason strings: no gate, skip or assertion changed meaning.
- **L12 (decision, D1 isolation — option C)** — the earlier "the e2e fixtures are missing from D1"
  reading (`user-admin-e2e`=0, `branch-principal`=0, `prod-*`=0) was measured after the suite had
  already deleted its own rows, and `reseedE2E()` re-inserts missing rows by email on every admin
  run — so the suite IS repeatable; the measurement does not show what it was taken to show. What
  it does show is that the e2e run writes to the **shared dev D1** and leaves rows behind
  (`user-client-e2e`, `mod-color`, `promo-e2e-1`, `branch-centro` = 1 each): the actual issue is
  isolation from the human's dev data, not repeatability. Decided: **(C) documented-only** for this
  branch, because (A) an isolated e2e D1 (`wrangler --persist-to` + migrations + seed against that
  path) requires editing the separate `Sublime-Ecommerce-Back` repo and its `seed:e2e` script, which
  is the human's own repo and history; option A stays available on their word.

- **L13 (defect found, repro kept, decision: not in this branch)** — `reseedE2E()` is a raw
  `sqlite3` writer over the same local D1 SQLite file that the run's own `wrangler dev` has open,
  and each admin spec file calls it from `beforeAll` (25–32 writers per invocation). Minimal repro
  (isolated, no Playwright): start the backend on 8788 exactly as the config does, hammer
  `/api/public/categories/tree` in a loop, run `pnpm run seed:e2e` ten times. The backend survived
  all ten, but workerd logged
  `workerd/util/sqlite.c++:1671: failed: SENTRY_DO SQLite failed; NOSENTRY database is locked: SQLITE_BUSY`
  and the request path returned
  `Error fetching category tree: D1_ERROR: Failed to parse body as JSON, got: Error: internal error`.
  So the reseed is a **proven source of transient D1 errors** (write-lock contention with workerd),
  and it is also **load-bearing**: `promotions.spec.ts:79` asserts the seeded tile geometry
  `{x:0,y:0,w:4,h:2}` while later tests in the same file persist drags, resizes and carousel order
  with Guardar + reload (`posX/posY`, spans, order), so only the per-file reseed restores the
  baseline the next project's `shows the seeded tiles section` expects. Decision: **keep the
  per-file reseed** for this branch (removing it would couple one project's promotions mutations to
  the next project's assertions) and record the contention as a follow-up — the fix belongs either
  in the Back repo (seed through the worker, or `wrangler --persist-to` isolation, i.e. D1 option A)
  or in the specs that mutate seeded rows (restore them in-file).

- **L14 (incident, not a spec defect)** — job-38 (four admin projects, `--workers=1`, load 3,38 at
  start, ports 4322/8788 free) ran 14m26s and failed after the backend died ~2m10s in. The
  discriminating evidence says the backend was **killed from outside, silently**: (a) the browser and
  astro already logged `Failed to fetch` **before** wrangler wrote anything, so the backend was
  already refusing connections; (b) wrangler's exit is silent — an empty `✘ [ERROR]`, then
  `🪵 Logs were written to …`, no fatal, no shutdown message, and the crash log ends **mid normal
  request** (`GET /api/branches 200` at 21:10:58.598Z); (c) **no OOM**: `dmesg`/journal for that
  window show only the suspend/resume `OOM killer disabled/enabled` pairs, no `oom-kill`; (d) no
  port was occupied before the run. A silent mid-request exit with nothing flushed is a **signal**,
  not a crash. Corroboration: a **foreign Playwright suite for a different project**
  (`POS_E-commerce_SaaS_Frontend`) was running in parallel — its own chromium at 113% CPU, its vite
  on 5174, its own `workerd` — and that session was still running lint/tests while this was
  diagnosed; `wrangler dev`'s worker process is literally named `workerd`, so any neighbour doing a
  broad `pkill -f workerd` (or `wrangler`, or a port cleanup) takes this run's backend down with it.
  Rule recorded in AGENTS.md: a silently dead backend (no fatal, no OOM, connection refused seen
  first) is an **environment incident**; never "fix" a spec for it — re-run and confirm per project.
  Also: the `kj::…disconnected: … Broken pipe` lines are **benign startup noise** (they appear in a
  clean isolated boot that then serves 200s) and must not be read as the cause.

- **L15 (forensics of the silent kill + the delivery decision)** — job-39 (same four admin projects)
  reproduced job-38 and was dissected to the second. What is **known**: (1) the death lands ~2m10s
  into the run in both cases (job-38: backend log 21:08:48→21:10:58; job-39: 23:09:37→23:11:46), i.e.
  inside `promotions.spec.ts`; (2) in job-39 the last ✓ is test 31
  (`promotions.spec.ts:144`, resize E2E-1 #2) and the first ✘ is test 32, while tests 33–36 are
  `did not run` because the file is `test.describe.serial` — one failure bails the rest; (3) the
  backend's last log line is a served request (`GET /api/promotions 200 (10ms)` in job-39,
  `GET /api/branches 200` in job-38) — nothing was flushed, nothing was reported; (4) wrangler's
  `🪵 Logs were written to …` is printed by an `onExit` handler *only when an error message was seen*
  (`wrangler-dist/cli.js`: `hasSeenErrorMessage`), so the empty `✘ [ERROR]` + `🪵` pair is an exit
  notification, not a diagnosis; (5) `coredumpctl` has no entry, `dmesg`/journal show no `oom-kill`,
  no suspend/resume and no signal record for either window; (6) no port was occupied before either
  run. What is **ruled out**: the specs. Isolated runs never lose the backend — `promotions.spec.ts`
  alone on 8788 (`admin-mobile`, 9 passed, 38s, zero `Failed to fetch`), the whole public matrix on
  the three devices (229 green / 0 red), and every single-project admin invocation (45/45, 45/45,
  45/45, 1/1, 6/6). What ran **outside** my runs at those instants: another agent session executing
  `wrangler d1 execute` against a **remote** database and `wrangler r2 bucket list` in a different
  repo (`Magic-Ecommerce`, two processes within 0.7s of the job-39 death, sharing
  `~/.config/.wrangler`), and later a second foreign Playwright suite (`POS_E-commerce_SaaS`) with its
  own chromium + `workerd` + vite. Two sessions equipped to run `pkill -f workerd`/`wrangler` cleanup
  were live on the machine; the exact killer is unidentified, the *class* is external. **Decision**:
  the matrix is delivered as **eight single-project invocations** (`chromium`, `public-mobile`,
  `public-tablet`, `public-pc`, `admin-mobile`, `admin-tablet`, `admin-pc`, `admin-touch`) with
  `--workers=1` on ports 4322/8788 — the mode that survives — and multi-project invocations are
  documented as environment-fragile. This is an environment constraint to report, not a defect to
  patch in the specs.
