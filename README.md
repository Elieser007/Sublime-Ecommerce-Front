# Sublime — E-commerce Storefront

Static storefront for a sublimation e-commerce business, built with **Astro 7**
(`output: 'static'`). The catalog is fully static (SSG): every page is
pre-rendered at build time and the browser makes **zero** runtime backend
requests on catalog pages — variant data (attribute modules, dependency rules,
pricing) is baked into the generated HTML. Auth, the admin panel, and `/api/me`
stay runtime.

The backend is a separate repo: **Sublime-Ecommerce-Back** (Hono + Cloudflare
Workers + D1 + R2 + Better Auth).

## Prerequisites

- Node.js >= 22.12
- pnpm 11.x
- A running backend for `pnpm run build` (see below)

## Setup

```sh
pnpm install
cp .env.example .env
```

`.env` only needs `PUBLIC_API_URL`, pointing at a reachable backend, e.g.:

```sh
PUBLIC_API_URL=http://localhost:8787
```

For local development the fallback is already `http://localhost:8787`, so the
`.env` file is optional when the backend runs locally.

## Commands

| Command           | Action                                                        |
| ----------------- | ------------------------------------------------------------- |
| `pnpm run dev`    | Start dev server at `localhost:4321`                          |
| `pnpm run build`  | Build the static site to `./dist/`                            |
| `pnpm run preview`| Preview the built site locally                                |
| `pnpm test`       | Run the vitest suite                                          |

> **`pnpm run build` REQUIRES a reachable backend.** Because the catalog is SSG,
> the build consumes the batched catalog endpoint
> (`GET /api/public/catalog?limit=100&offset=N`, batches of 100), the category
> tree, and the two promotion sections from `PUBLIC_API_URL` at build time.
> The catalog pipeline prefetches batch N+1 before batch N is processed and
> always issues one extra speculative batch past the last full one (aborted
> once the empty terminator page arrives), so the request total is
> `⌈products/100⌉ + 5`: about **6 requests for the seeded catalog** (~73
> products — 3 catalog fetches + 1 tree + 2 promotions) and **7 requests at
> ~200 products** (4 catalog fetches + 1 tree + 2 promotions). The batch
> pipeline fails loudly: an unreachable backend or a non-ok/corrupt/timeout
> batch makes `getStaticPaths()` throw and `astro build` fail on the product
> pages — it does NOT degrade to an empty catalog. Point `PUBLIC_API_URL` at a
> running backend (e.g. `pnpm run dev` in Sublime-Ecommerce-Back) or at a
> deployed API before building.

## Architecture

- **Catalog pages** (`/`, `/products/[slug]`, `/wishlist`, ...) are pre-rendered
  at build time. All pages share ONE batched catalog fetch (memoized in
  `src/lib/catalog-build.ts`): `fetchCatalogBatches` (`src/lib/catalog-batch.ts`)
  paginates the backend catalog endpoint with pipelined prefetch (batch N+1 is
  requested before batch N is processed) and per-batch 10s AbortController
  timeouts. Variant availability and price are resolved client-side from the
  dependency graph baked into the page (`window.__VARIANTS_DATA__` on detail
  pages, a `variants` attribute on product cards). No runtime `/api/public/*`
  fetches on catalog pages.
- **Variant fallback** is bake-outcome based (`bakeFailed`, computed in
  `resolveProductGraph`): a product whose payload said modules should exist but
  delivered a missing/corrupt graph shows a fallback notice and blocks
  add-to-cart; a clean payload with zero modules (e.g. products with SKUs but
  no attribute modules) is a genuine "no variants" product and stays
  purchasable. The flag is forwarded pages → `<product-card>` → `<variant-modal>`
  via the `bake-failed` attribute.
- **Auth** (`/api/auth/*`), **`/api/me`** (header session check), and the
  **admin panel** (`/admin/*`) remain runtime calls to the backend.
- **Cart & wishlist** are localStorage-only; the cart modal (`<variant-modal>`)
  consumes the baked variant data and never fetches.
- Client-side dependency filtering lives in `src/lib/variant-filter.ts`
  (`resolveAvailable`), a 1:1 port of the backend's `/variants` availability
  semantics. Build-time baking lives in `src/lib/catalog-batch.ts` +
  `src/lib/catalog-build.ts`.

## Testing

- Unit/source tests: `pnpm test` (vitest, `src/**/*.test.ts`).
- E2E (Playwright, requires dev server + backend): `pnpm exec playwright test`.
