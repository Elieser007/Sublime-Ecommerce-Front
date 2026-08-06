# Spec: Routing

## Requirement: English route files

The system MUST serve product detail at `/products/:slug`, wishlist at `/wishlist`, and admin creation at `/admin/new`. Files MUST be moved via `git mv`: `src/pages/producto/[slug].astro` → `src/pages/products/[slug].astro`, `src/pages/admin/nuevo.astro` → `src/pages/admin/new.astro`.

- GIVEN a product with slug `x` WHEN navigating to `/products/x` THEN the product detail page renders
- GIVEN `/admin/new` WHEN navigating THEN the creation form renders

## Requirement: Legacy redirects

The system MUST ship `public/_redirects`: `/producto/* /products/:splat 301`, `/deseos /wishlist 301`, `/admin/nuevo /admin/new 301`. New code MUST NOT use `/producto`, `/deseos`, `/admin/nuevo`, `/catalogo` outside `_redirects` and docs.

- GIVEN a Pages deploy WHEN requesting `/producto/any-slug` THEN 301 to `/products/any-slug` (post-deploy; `astro dev` ignores `_redirects`)
- GIVEN a sweep for the four legacy paths THEN no matches outside `_redirects`, AGENTS.md, specs
- GIVEN the production build THEN `dist/` contains the `_redirects` rules

## Requirement: Internal references updated

All internal references MUST target English routes: product-card link prefix `/products/`, Header `isCatalog` prefix `/products`, dashboard links `/admin/new` and `/` (fixing dead `/catalogo`), AdminSidebar mapping `new`, promotions placeholder `/products/...`, AGENTS.md route docs.

- GIVEN a rendered product card THEN its link href starts with `/products/`
- GIVEN a product detail page header THEN `isCatalog` is true
- GIVEN the rendered dashboard THEN the new-product card links `/admin/new` and the catalog card links `/`
- GIVEN the sidebar on `/admin/new` THEN the products section is active

## Requirement: Route-dependent tests updated

Tests referencing legacy routes MUST update same-commit as the moves: `getStaticPaths.test.ts`, `detail-volume.test.ts`, `variant-price-sync.test.ts` (`pages/products/[slug].astro` path), `admin-landing.test.ts` (`new`), `escape-html.test.ts` fixture; E2E `catalog.spec.ts`, `responsive.spec.ts` (selectors + `waitForURL`), `detail-volume.spec.ts` goto, promotions `VALID_PROMO_LINK`, `helpers.ts` `productCreate`, config comment.

- GIVEN the moved pages WHEN running `pnpm test` THEN all unit tests pass
- GIVEN the E2E suite WHEN running `pnpm exec playwright test` THEN it targets new routes only
