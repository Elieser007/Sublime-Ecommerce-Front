# Archive Report — English Routes & Wishlist

**Change**: english-routes-and-wishlist
**Branch**: `feat/english-routes-wishlist` @ `266442b`
**Archive date**: 2026-08-05
**Phase**: sdd-archive (terminal) — SDD cycle complete

## Final State (at close)

The change is **COMPLETE and verified**. This report is the terminal record of the cycle and describes the state at close; where intermediate snapshots (`apply-progress`, `verify-report`) differ from final facts, the higher-ranked sources (native review authority, persisted tasks artifact, orchestrator launch prompt) govern.

| Dimension | Final state |
|-----------|-------------|
| Tasks | 14/14 complete (4 stacked work units U1–U4) |
| Implementation | Shipped on `feat/english-routes-wishlist`, 11 commits (`35e4080` → `266442b`) |
| Spec compliance | 8/8 requirements, 27/27 scenarios compliant |
| Review | APPROVED — lineage `review-68863921549bdf5b`, lens `review-reliability`, receipt published, evidence outcome `passed` |
| Unit suite | 51 files / 847 tests passed, exit 0 |
| Build | 155 pages (`dist/products/` 139 per-slug, `dist/admin/new/`, `dist/wishlist/`, `dist/_redirects` with the exact 3 rules) |
| E2E at close | catalog 110/110, responsive product-detail pass, detail-volume 2/2 warm (1 pre-existing cold-compile flake), wishlist 6/6, admin promotions 5/5 |
| CRITICAL findings | 0 |
| Blockers | 0 |

## Artifact Observation IDs (Engram traceability)

| Artifact | Engram obs |
|----------|-----------|
| exploration | #984 |
| proposal | #994 |
| spec | #995 |
| design | #996 |
| tasks | #997 |
| apply-progress | #998 |
| verify-report | #1006 |
| **archive-report (this artifact)** | Engram topic `sdd/english-routes-and-wishlist/archive-report` |

## Review Gate (Native)

- `gentle-ai review status`: lineage `review-68863921549bdf5b` — `status: approved`, `state: approved`, `problems: []`.
- `review-receipt.json` (schema `gentle-ai.review-receipt/v2`): `terminal_state: approved`, `evidence_outcome: passed`, `evidence_target_identity` matches lineage, `selected_lenses: ["review-reliability"]`, `risk_level: medium`, `receipt_published: true` (finalize journal attempt 2), `final_candidate_tree: 1340653bb0b6233471356f1730911812cb9fa3b8`, `base_tree: 35d1090905f5109416f67ae5d536f7080636d70c`, `fix_delta_hash` = empty sha256 (no fix delta).
- `review-state.json` snapshot: `current-changes` kind, paths digest `sha256:bf2403e5…`, `intended_untracked` includes the openspec change artifacts (proposal/specs/design/tasks/apply-progress/exploration) + `pnpm-workspace.yaml` — the receipt was validated against this exact tree.
- `gentle-ai sdd-status --json` (run at archive time): `reviewGate.result: allow` — "approved receipt exactly matches authoritative native state and the current repository"; `blockedReasons: []`.

### Dispatcher nuance (recorded, not a blocker)

The same native status reports `dependencies.archive: blocked` and `nextRecommended: verify` with **empty** `blockedReasons`. Explanation: this repo has **no `openspec/config.yaml`** (never initialized with sdd-init's config/specs/archive scaffold), so the dispatcher lacks declared test/build commands to independently re-validate the verify envelope and leaves `verify` in `ready` routing. The terminal review gate itself is `allow`, the receipt matches the current repository, and `gentle-ai sdd-verify-validate --requirements 8 --scenarios 27` re-validated the exact persisted envelope bytes as `valid: true / verdict: pass` (evidence_revision `sha256:e11fb5a3…`). Per the Final-State Authority hierarchy, native review authority + the orchestrator's launch-prompt final-state facts (verify PASS, review APPROVED, receipt present) govern; the dispatcher label is routing state, not a blocker.

## Spec Sync Decision

**No `openspec/specs/` main-spec tree exists in this repo** (no `openspec/config.yaml`, no `openspec/specs/`, no `openspec/changes/archive/`). The repository convention — evidenced by `fase-0-scaffolding` and `fase-1-design-system` also remaining in `openspec/changes/` — keeps change folders in place, with delta specs as the permanent spec record.

- The two delta specs (`specs/routing/spec.md`, `specs/wishlist/spec.md`, 8 requirements / 27 scenarios total) ARE the source of truth for this change; there is no main spec to merge into or create.
- **Change folder NOT moved**: moving `openspec/changes/english-routes-and-wishlist/` to an archive path would alter the paths digest that the approved native review receipt pins (its snapshot lists these exact paths as `intended_untracked`), invalidating the review gate. Keeping the folder in place preserves the receipt match.
- This archive report is the terminal artifact of the cycle, per the orchestrator's explicit archive contract.

## Tasks (persisted artifact — final)

`tasks.md` shows **14/14 implementation tasks checked `[x]`** across 4 phases (U1 lib 1.1–1.2, U2 page+Header 2.1–2.3, U3 moves+sweep+redirects 3.1–3.5, U4 e2e+docs 4.1–4.4). No stale unchecked tasks. No archive-time reconciliation was needed or performed.

## Verification (final, per verify-report #1006 + launch-prompt facts)

- **Unit**: `pnpm test` → 51 files / 847 tests, exit 0 (test_output_hash `sha256:f5e68a8d…`).
- **Build**: `PUBLIC_API_URL=http://localhost:8787 pnpm build` → exit 0, 155 pages (build_output_hash `sha256:05071776…`); `dist/products/` 139 per-slug pages, `dist/admin/new/index.html`, `dist/wishlist/index.html`, `dist/_redirects` byte-exact 3 rules.
- **Grep gate**: `/producto`, `/deseos`, `/admin/nuevo`, `/catalogo` clean in production code + e2e/ + config; remaining matches only in `_redirects` (rules), test assertions, AGENTS.md docs.
- **TDD compliance**: 6/6 checks (RED→GREEN evidence per task, triangulation, safety-net baseline re-runs 47/801 → 48/821 → 49/837 → 51/847).
- **Warnings (3, all informational — none block)**:
  - W1: `_redirects` runtime 301 behavior is Cloudflare Pages-only; unit-level guarantee is static rule assertion + `dist/_redirects` presence. Post-deploy check is the open follow-up.
  - W2: `e2e/wishlist.spec.ts` not re-executed in the verify session (Playwright requires :4321/:8787 free; user-owned dev servers occupy them). It passed during apply U4: **6/6 first run**; worktree untouched since that run. Reported per its source and time, not as a fresh claim.
  - W3: no integration-test layer (jsdom/testing-library not installed) — consistent with repo convention; covered by unit + static-source markers + E2E.

## E2E at Close (final-state facts, forwarded by orchestrator)

- catalog 110/110; responsive product-detail tests pass; detail-volume 2/2 warm (1 pre-existing cold-compile flake, warm-pass); wishlist.spec 6/6 (apply U4 evidence, per W2); admin promotions 5/5.

## Shipped Surface

- **New**: `src/lib/wishlist.js` + `src/lib/wishlist.test.ts` (20 tests), `src/pages/wishlist.astro`, `src/__tests__/wishlist-page.test.ts` (16 markers), `src/__tests__/route-sweep.test.ts` (6), `src/__tests__/redirects.test.ts` (4), `public/_redirects` (3 rules), `e2e/wishlist.spec.ts` (6 tests).
- **Moved (git mv)**: `producto/[slug].astro` → `products/[slug].astro`; `admin/nuevo.astro` → `admin/new.astro`.
- **Modified**: Header.astro (badge + `/wishlist` href + `isCatalog`), product-card.js, dashboard.astro (`/admin/new`, `/catalogo`→`/`), AdminSidebar.astro, promotions.astro, 6 unit test files (same-commit path updates), 6 e2e files, playwright.config.ts, AGENTS.md (7 doc regions).
- **Config surface**: `pnpm-workspace.yaml` local build-script approval (esbuild/sharp) is part of the change's config surface — remains an uncommitted local worktree modification; the same approval is being merged from the hotfix branch (tracked outside this change).

## Follow-ups (post-deploy, NOT part of this change)

1. Verify the 3 `_redirects` 301 rules live on Cloudflare Pages after publishing (`/producto/*` splat, `/deseos`, `/admin/nuevo`).
2. Backend data cleanup is tracked in another repo (out of scope here).

## Verdict

**ARCHIVED — SDD cycle complete.** 14/14 tasks, review APPROVED (receipt matches current tree), verification PASS (8/8 requirements, 27/27 scenarios, 0 critical, 0 blockers), 51 files/847 unit tests, 155-page build, E2E green at close. No CRITICAL findings; 3 informational warnings documented. Archive is intentional with no warnings requiring override; the change folder is retained in place per repo convention and receipt-path integrity.
