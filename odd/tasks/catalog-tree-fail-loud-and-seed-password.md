# Feature: fail loud on an empty category tree, and stop seeding weak admin passwords

Status: in progress on `fix/catalog-tree-fail-loud` (Front) + `chore/seed-admin-password` (Back)
Owner: orchestrator + user

## Why

Two findings from the previous round:

1. **The catalog can silently bake an empty category tree.** `src/pages/index.astro:45`
   fetches the tree in the frontmatter with a 10s timeout and the per-section
   `try/catch` degrades it to `tree = []`, which renders "Sin categorías". That
   degradation is *deliberate and documented* in the file's header comment
   ("the auxiliary sections … degrade ONLY that section while the product grid
   still renders"), but the consequence is user-visible: a Cloudflare Pages build
   can ship a catalog with no filters and nobody notices. The parallel-load e2e
   failures that started this investigation were exactly that: bursts of failed
   tree requests served pages with zero category labels.
2. **`scripts/seed-admin.ts` creates the production admin with a hardcoded weak
   password** (`admin123`), pushes it to the remote D1, prints it, and builds the
   SQL by string interpolation. The production admin currently in use still has
   that password.

## Scope

### Front (`Sublime-Ecommerce-Front`)

- New `src/lib/` helper that fetches JSON with bounded retries (attempts,
  per-attempt timeout, backoff) and throws a clear, endpoint-naming error when
  every attempt fails; unit-tested in `src/lib/*.test.ts` style.
- `src/pages/index.astro`: the category tree goes through the helper and becomes
  **fail-loud** — an unreachable/failed tree request fails the build (Pages shows
  a failed deploy instead of shipping a filter-less catalog), and a successful
  response with an empty tree also fails loudly. The file's header comment must
  be updated to state the new contract and why it changed.
- Promotions keep their cosmetic degradation, but go through the retry helper and
  warn loudly when they end up empty because of a failure.
- The two hardened e2e specs treat an error page as retryable so a genuinely
  failing dev backend surfaces as a loud test failure instead of a mystery.

### Back (`Sublime-Ecommerce-Back`)

- `scripts/seed-admin.ts` takes the password from `ADMIN_SEED_PASSWORD`, refuses
  to run without it, refuses weak values (length and a small denylist including
  the old default), never prints the secret, and stops building SQL by
  interpolation (write a `.sql` file and use `--file`, the pattern the other
  seeds already use). Idempotency stays: skip when the admin already exists.
- Unit test for the password validator, placed where this repo's vitest config
  picks it up.
- The production admin's existing password is the user's to rotate; the script
  must no longer be able to create one like it.

## Tasks

- [ ] Task 1 — Front: retry helper + unit tests (RED/GREEN).
- [ ] Task 2 — Front: tree fail-loud + promo warning + header comment + e2e
      helper tolerance; verify with a build against an unreachable API (must
      fail) and against the real API (must succeed).
- [ ] Task 3 — Back: env-driven, validated, non-interpolated `seed-admin.ts` +
      validator test.
- [ ] Task 4 — Verify, commit, native review, merge, and confirm the production
      Pages build still succeeds.

## Verification plan

| Check | Command |
| --- | --- |
| Front unit | `npm test` |
| Build fails loud | `PUBLIC_API_URL=http://127.0.0.1:9 npm run build` must exit non-zero with the helper's message |
| Build succeeds | `PUBLIC_API_URL=https://api.sublimepy.store npm run build` |
| Public battery | the 9-file Playwright battery, twice |
| Back unit | `pnpm test` |
| Production | Pages build for the merge succeeds; live catalog still renders its filters |

## Not in scope

- Rotating the production admin password (user decision; the script fix only
  prevents future weak ones).
- The local admin-battery flakiness caused by `wrangler dev`/workerd dying on
  long runs (environment, tracked separately).
