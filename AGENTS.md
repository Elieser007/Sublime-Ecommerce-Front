# AGENTS.md — Sublime E-commerce Frontend

## Project Overview

Astro SSG frontend for a medium-business e-commerce. Dark theme, CMYK accent palette, sharp corners, Swiss-inspired functionalism. All public pages are pre-rendered at build time; admin pages use client-side auth guards.

**Deployment**: Cloudflare Pages (auto-deploys from `main`). Build command: `pnpm build`, output: `dist/`.

## Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Framework | Astro 7.x | `output: 'static'` — no adapter, no SSR |
| Language | TypeScript strict | extends `astro/tsconfigs/strict` |
| Auth | Better Auth | Client-side via `better-auth/client` |
| CSS | LightningCSS | `minify: false`, `errorRecovery: true` |
| Unit tests | vitest 4.x | `src/**/*.test.ts` |
| E2E tests | Playwright | `e2e/` directory, Chromium only |
| Package manager | pnpm | Node >= 22.12.0 |

## Commands

```bash
pnpm dev          # Astro dev server (localhost:4321)
pnpm build        # Static build → dist/
pnpm preview      # Preview production build
pnpm test         # vitest run (unit tests)
pnpm exec playwright test   # E2E tests (auto-starts dev server)
```

## Folder Structure

```
src/
├── pages/                    # File-based routing
│   ├── index.astro           # / — Product catalog (SSG, fetch at build)
│   ├── home.astro            # /home — Hero + featured products
│   ├── cart.astro            # /cart — Shopping cart (LocalStorage)
│   ├── login.astro           # /login — Email/password + OAuth (Google, Facebook)
│   ├── register.astro        # /register — Registration form
│   ├── dashboard.astro       # /dashboard — Protected user dashboard
│   ├── producto/
│   │   └── [slug].astro      # /producto/:slug — Product detail (SSG via getStaticPaths)
│   └── admin/                # Protected admin panel
│       ├── index.astro       # Product list (placeholder data)
│       ├── products.astro    # Product management (API-driven)
│       ├── nuevo.astro       # Create product (AdminProductForm component)
│       ├── categories.astro  # Category management
│       ├── users.astro       # User management
│       ├── orders.astro      # Order management
│       ├── promotions.astro  # Promotion management
│       ├── branches.astro    # Branch management
│       └── attribute-modules.astro  # Attribute module management
├── layouts/
│   ├── BaseLayout.astro      # Main layout: Header + Footer + global CSS
│   └── AdminLayout.astro     # Wraps BaseLayout + auth guard (requireAuth)
├── components/
│   ├── Header.astro          # Fixed header: logo, search, cart/wishlist/user icons
│   ├── Footer.astro          # CMYK bar + brand info
│   ├── Logo.astro            # SVG logo component
│   ├── Button.astro          # Button system (primary/secondary/ghost variants)
│   ├── Input.astro           # Form input component
│   ├── Chip.astro            # Tag/chip component
│   ├── CartSummary.astro     # Cart page summary sidebar
│   ├── CategoryFilter.astro  # Category filter component
│   ├── ProductGallery.astro  # Image gallery for product detail
│   ├── ImageUploader.astro   # Image upload with canvas processing
│   ├── PromotionWall.astro   # Dynamic promotion renderer by display type
│   ├── VolumePriceBadge.astro    # Volume pricing badge
│   ├── VolumePriceSelector.astro # Volume tier selector (select dropdown)
│   ├── PriceTierList.astro       # Price tier list display
│   ├── product-card.js      # <product-card> Web Component (Shadow DOM)
│   ├── promo/                # Promotion display type components
│   │   ├── HeroPromo.astro
│   │   ├── CarouselPromo.astro
│   │   ├── TilesPromo.astro
│   │   ├── SplitPromo.astro
│   │   ├── BannerPromo.astro
│   │   ├── RibbonPromo.astro
│   │   └── index.ts
│   ├── admin/                # Admin-specific components
│   │   ├── DataTable.astro
│   │   ├── AttributeManager.astro
│   │   ├── DependencyForm.astro
│   │   ├── Badge.astro
│   │   └── TableAction.astro
│   ├── AdminSidebar.astro    # Admin navigation sidebar
│   ├── AdminTable.astro      # Admin product table
│   └── AdminProductForm.astro # Product create/edit form
├── lib/                      # Utility functions (client-side)
│   ├── public-api.ts         # Public API client (fetchProducts, fetchCategoryTree, formatPrice, etc.)
│   ├── auth-client.ts        # Better Auth client setup
│   ├── auth-guard.ts         # requireAuth() — redirects to /login on 401
│   ├── cart.js               # LocalStorage cart (getCart, addToCart, addToCartWithOptions, etc.)
│   ├── image.ts              # Canvas image processing (resize ≤1000x1000, WebP 80%)
│   ├── image-types.ts        # GalleryImage, UploadResult types
│   ├── image-utils.ts        # Generic image CRUD (upload, associate, replace, delete)
│   ├── whatsapp.ts           # WhatsApp checkout (buildCartMessage, generateWhatsAppUrl)
│   ├── format.ts             # formatPrice (Guaraníes, es-PY locale)
│   ├── filter.ts             # filterByPrice, filterBySearch
│   ├── sort.ts               # sortProducts (price-asc, price-desc, name, default)
│   ├── pagination.ts         # paginateProducts (24 per page)
│   ├── price-utils.ts        # Volume pricing (getBestVolumeBadge, getTierPrice, etc.)
│   ├── variant-logic.ts      # Variant selection (computeFinalPrice, filterAvailableOptions)
│   ├── escape-html.ts        # XSS prevention (escapeHtml, sanitizeUrl)
│   ├── admin-products.ts     # Admin product list + gallery upload logic
│   ├── admin-gallery.ts      # Admin gallery state (add, remove, reorder, setPrimary)
│   ├── gallery-utils.ts      # Gallery navigation (getNextImage, getPrevImage, etc.)
│   ├── product-form.ts       # Product form API calls (create, associate, upload)
│   ├── promo-upload.ts       # Promotion image upload state
│   └── user-avatar.ts        # User avatar upload state
├── styles/
│   ├── global.css            # Design system: CSS custom properties, typography, grid, reset
│   └── admin-shared.css      # Shared admin panel styles (layout, forms, tables, modals, responsive)
├── __tests__/                # Unit tests (vitest)
│   ├── admin-*.test.ts       # Admin feature tests (gallery, products, responsive, sidebar)
│   ├── product-*.test.ts     # Product feature tests (gallery, form)
│   ├── catalog-fetch.test.ts # Catalog fetch logic tests
│   ├── getStaticPaths.test.ts # getStaticPaths tests
│   ├── gallery-utils.test.ts # Gallery navigation tests
│   ├── promo-upload.test.ts  # Promo upload tests
│   ├── token-compliance.test.ts # Token compliance tests
│   └── user-avatar.test.ts   # Avatar tests
└── components/
    ├── __tests__/            # Component-level tests
    ├── PriceTierList.test.ts
    ├── VolumePriceBadge.test.ts
    └── VolumePriceSelector.test.ts
e2e/                          # Playwright E2E tests
├── catalog.spec.ts           # Catalog browsing, sort, filter, search, pagination, mobile panels
├── cart.spec.ts              # Cart page, quantity, remove, summary, mobile
├── admin.spec.ts             # Admin panel tests
└── responsive.spec.ts        # Responsive layout tests
```

## Architecture

### SSG Data Flow

1. **Build time**: `fetch()` calls in frontmatter hit `PUBLIC_API_URL` (default `http://localhost:8787`)
2. **Static HTML**: All product data is embedded in the generated HTML
3. **Client-side JS**: `<script>` tags handle interactivity (filters, cart, variants)

### API Communication

- **Public pages** (`/`, `/producto/:slug`): Fetch at build time via `fetch()` in frontmatter. No runtime API calls.
- **Admin pages**: Runtime fetch to `PUBLIC_API_URL` with `credentials: "include"` for auth cookies.
- **Auth**: Better Auth client connects to Hono backend. Login/register via `POST /api/auth/sign-in/email` or OAuth social providers. Session check via `GET /api/me`.

### State Management

- **Cart**: LocalStorage (`cart` key). `cart.js` is the single source of truth. Events: `storage`, `cart-updated`.
- **Product detail variants**: Client-side fetch to `/api/public/products/:id/variants` on selection change.
- **No global state library** — vanilla JS with DOM manipulation.

### Component Patterns

- **Astro components**: Server-rendered, `<script>` tags for client-side behavior.
- **Web Components**: `<product-card>` uses Shadow DOM for encapsulation. Defined in `product-card.js`, registered via `customElements.define()`.
- **`is:inline` scripts**: Used for runtime config injection (e.g., `window.__PRODUCT_DATA__`).
- **Scoped styles**: Each component has its own `<style>` block. `:global()` used for styles that escape component boundaries.

### Image Handling

- **Upload**: `image.ts` processes images client-side via `<canvas>` API — resize to ≤1000x1000, convert to WebP at 80% quality.
- **Storage**: Images go to R2 via backend's `POST /api/upload`. No-overwrite policy (unique filenames).
- **Display**: `getProductImageUrl()` returns the URL or `/placeholder-product.svg` fallback.

## Design System

- **Theme**: Dark background (`#000000`), light text (`#e2e2e2`)
- **Palette**: CMYK accents — Primary (Cyan `#82cfff`), Secondary (Magenta `#ffb0cc`), Tertiary (Yellow `#d5ca00`)
- **Typography**: Anton (display), Hanken Grotesk (body), Space Mono (mono/labels)
- **Spacing**: 8px grid system via CSS custom properties (`--space-xs` through `--space-4xl`)
- **Layout**: `--margin-mobile: 16px`, `--margin-desktop: 64px`, `--max-width: 1280px`
- **Border radius**: 0px (sharp corners by design)
- **Responsive breakpoints**: 640px (tablet), 768px (desktop), 1024px (large desktop)
- **Accessibility**: `focus-visible` outlines, skip links, aria attributes, reduced motion support, 44px touch targets on mobile

## Testing

### Unit Tests (vitest)

- **Location**: `src/**/*.test.ts` and `src/__tests__/*.test.ts`
- **Run**: `pnpm test`
- **TDD**: RED → GREEN → TRIANGULATE → REFACTOR
- **Globals**: Enabled (`globals: true` in vitest.config.ts)

### E2E Tests (Playwright)

- **Location**: `e2e/*.spec.ts`
- **Run**: `pnpm exec playwright test`
- **Browser**: Chromium only
- **Config**: `playwright.config.ts` — auto-starts dev server on port 4321
- **CI**: JUnit reporter to `test-results/e2e.xml`, 2 retries

## Conventions

- **TypeScript strict mode** — no exceptions
- **Conventional commits** — `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- **No comments in code** unless critical (XSS prevention, CSS scoping notes). Exception: `variant-selector.js` keeps its component-level contract docs (header, section dividers) and design-traceability comments such as the D1 renderer-reuse note in the `VariedadSelector` case — that Web Component predates this rule and its comments are part of the SDD design record (change `caramelos-variedad`).
- **Pure functions in `lib/`** — extract logic from `.astro` `<script>` blocks for testability
- **No mutation** — lib functions return new arrays/objects
- **Price formatting**: Always use `formatPrice()` from `lib/format.ts` — Guaraníes, no decimals, `es-PY` locale. Exception: `variant-selector.js` renders signed modifier hints (`+₲1.000`) with its own `_formatModifier` — `formatPrice()` outputs a bare decimal number (no sign, no ₲ symbol), so the REQ-3 hint contract (sign + ₲ + es-PY grouping) cannot be expressed through it; the component predates this rule.
- **API URL**: Always read from `import.meta.env.PUBLIC_API_URL` with `http://localhost:8787` fallback
- **Credentials**: All API fetch calls use `credentials: "include"` for cookie-based auth

## Important Rules

1. **SSG only** — no server-side rendering. `output: 'static'` in astro.config.mjs. Pages compile at build time.
2. **No adapter** — the old AGENTS.md mentioned `@astrojs/cloudflare` but it's not installed. Pure static output.
3. **Client-side JS** — cart, filters, variants, and WhatsApp link run in the browser via `<script>` tags.
4. **Images** — process with `<canvas>` API before uploading. Backend expects WebP.
5. **No backend calls in public catalog** — the catalog is static. Backend calls only in admin panel and auth flows.
6. **LocalStorage for cart** — no server-side cart. Checkout = WhatsApp link.
7. **Better Auth** — client-side auth. `requireAuth()` in AdminLayout redirects to /login on 401.
8. **Node >= 22.12.0** — required by package.json engines field.

## Agent Workflow

Before doing ANY work, start your servers:

1. Run `./start.sh` from the worktree root (parent of this directory)
2. The script reads `.agent-env` for your port assignments
3. Verify with: `curl -s http://localhost:YOUR_PORT/` should return 200
4. Check `.agent-env` for your specific ports — do NOT guess ports.
