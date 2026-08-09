# Exploration — promo-visual-editor

> SDD explore phase. Research-only document: maps the current implementation, identifies gaps,
> compares design options, and recommends an architecture for a WYSIWYG visual promotions editor.
> No code was changed; this document is the basis for the proposal/design phases.

## 1. Current State Map

### 1.1 Admin promotions UX (Front — `src/pages/admin/promotions.astro`, 982 lines)

One page, one inline `<script>` (no component split), vanilla JS + DOM string rendering.

**Layout**
- Left: section list from `GET /api/promotion-sections` (`promo-sections-list`), each card shows `name`, `slug`, `grid_cols×grid_rows`.
- Right (`#promo-manager`, shown after selecting a section):
  - `#grid-cols-select` (1–4) and `#grid-rows-select` (1–3) — **fire `PUT /api/promotion-sections/:id` immediately on change** (per-interaction server calls).
  - `#display-type-select` (tiles/carousel/hero/split/banner/ribbon) — **fires `PUT /api/promotion-sections/:id` immediately on change**.
  - Live preview `#live-preview-container` rebuilt via `buildPromoPreviewHtml()` from `promo-preview.ts`; carousel gets auto-play wiring.
  - Promotions list (`#promos-list`) of cards with ✏️/🗑️ buttons (`window.editPromo` / `window.deletePromo` inline `onclick`).
- Create/Edit modal (`#modal-overlay`): image upload area + title + link + description + tile-options (width 1–4 / height 1–3 / posX number / posY number).
- Hidden `#delete-overlay` confirm modal **exists in HTML but is never wired** (no JS references `delete-confirm`/`delete-cancel`) — dead markup today.

**Data flow**
- `loadSections()` → `GET /api/promotion-sections` → `renderSections()`.
- `selectSection(id)` → sets `currentDisplayType`, populates selects, `loadPromotions()`.
- `loadPromotions()` → `GET /api/promotions?section={slug}` → `renderPromotions()` + `renderPreview()`.
- Submit handler builds body `{ sectionId, imageUrl, title, subtitle, link, posX, posY, width, height }` → `POST /api/promotions` (create) or `PUT /api/promotions/:id` (edit). If `promoImageState.isNew`, first `uploadImageBlob` → then `associateImage('promotions', promoId, imageUrl, ...)`.

**Image handling today** (`src/lib/promo-upload.ts`, `src/lib/promo-preview.ts`)
- `PromoImageState` = `{ blob, url, imageId, isNew }` — pure state machine (empty/blob/url/clear, preview URL).
- `handlePromoFile` calls `processImage(file)` (same as products) then `setPromoImageFromBlob`.
- Image deletion: `promoRemove` click → `clearPromoImage(state)` + clears hidden `#promo-image-url` → but on submit the image becomes "required" (`La imagen es requerida`) → **you cannot actually remove an image from an existing promo today**; the `delete-overlay` confirm is dead and the ✕ is only a local preview-clear that blocks saving.
- **Duplication with products**: promo page re-implements upload+associate inline; `fetchEntityImages`/`deleteImage` are imported in the script but **never used**; the same upload→associate→delete logic lives in `products.astro`, `admin-products.ts`, `user-avatar.ts`, etc. `image-utils.ts` already centralizes the generic calls, but promos only use a subset.

### 1.2 Public renderers (`src/components/PromotionWall.astro`, `src/components/promo/*`)

- `PromotionWall.astro` switches on `sectionInfo?.displayType` and renders one of `HeroPromo`, `CarouselPromo`, `TilesPromo`, `SplitPromo`, `BannerPromo`, `RibbonPromo`.
- `TilesPromo.astro` — **hardcodes `gridCols = 4`** (line 23) and computes `col = position % gridCols + 1`, `row = floor(position / gridCols) + 1`; **ignores `posY` and `grid_rows` entirely**.
- `promo-preview.ts` `buildTiles` — same flat `position % cols` model, `grid-auto-rows:160px`; used by admin preview.
- Carousel/split/ribbon/hero/banner render **in array order** (which the backend orders by `pos_x`).
- Storefront usage: `index.astro` fetches `/api/public/promotions?section=always-catalog-top|bottom` at build time (SSG) and renders `PromotionWall`.

**Key model quirk**: the backend maps DB `pos_x` → response `position`, and tiles derive row from `position / gridCols`. `pos_y` **exists in the DB and is accepted by POST/PUT but is never returned by GET** (see 1.3), so edit-mode always falls back to `posY = 0` and public tiles ignore it. The tile grid is effectively **flat-indexed by `pos_x`**, with `posY` write-only.

### 1.3 Backend contract (`Sublime-Ecommerce-Back`)

**`src/routes/promotions.ts`**
- `GET /api/promotion-sections` (public): `{ sections: [{ id, name, slug, description, grid_cols, grid_rows, display_type }] }`.
- `PUT /api/promotion-sections/:id` (admin, `requireAdmin`): `{ name?, description?, gridCols?, gridRows?, displayType? }` — COALESCE update.
- `GET /api/promotions?section={slug}` (public): via `buildPromotionQuery` — SELECT `pos_x, width, height` (not `pos_y`) + `section_id, section_slug, grid_cols, display_type`; `ORDER BY p.pos_x`. Response via `rowToPromotion`: `{ id, title, subtitle, imageUrl, link, position: pos_x, tileCols: width, tileRows: height }`. **`pos_y` never selected/serialized.**
- `POST /api/promotions` (admin): zod `promotionCreateSchema` = `{ sectionId*, title*, imageUrl*, link* (httpUrl|relative), subtitle?, posX?, posY?, width?, height? }` → INSERT.
- `PUT /api/promotions/:id` (admin): `promotionUpdateSchema` (all optional) → COALESCE UPDATE.
- `DELETE /api/promotions/:id` (admin): hard DELETE row. **Does not delete the R2 object; association rows die via FK cascade (migration 0004 has `ON DELETE CASCADE`).**

**`src/lib/promotions.ts`** — query builders + mappers shared by admin and public routes. `PromotionRow` interface also omits `pos_y`.

**`src/routes/entity-images.ts`** — generic factory `createEntityImageRoutes({ entityTable: "promotion", imageTable: "promotion_image", entityIdColumn: "promotion_id", routePrefix: "/api/promotions", entityName: "Promotion" })` mounted in `index.ts`. Routes: GET/POST/PUT/PATCH/DELETE `/api/promotions/:id/images[/:imageId]`.
- **`DELETE /api/promotions/:id/images/:imageId` only deletes the association row — it does NOT delete the R2 object.** Products rely on the client calling `deleteUploadedFile()` after (`DELETE /api/upload/:filename`) — see 1.4. Promotions never do.
- `PUT` (replace) also leaves the old R2 object orphaned.

**`src/routes/upload.ts`**
- `POST /api/upload` (admin, rate-limited 30/min): multipart `image` → `uploadPublicImage` → R2 put with unique `{timestamp}-{uuid}.{ext}`, returns `{ success, url, filename, size }`.
- `GET /api/upload/:filename` (public): serves R2 object with immutable cache.
- `DELETE /api/upload/:filename` (admin): `head()` then `IMAGES.delete(filename)` — **this is the only R2 deletion path**.

**`src/routes/public.ts`** — `GET /api/public/promotions?section=` mirrors the admin GET via the same `lib/promotions.ts` helpers (same response shape, same missing `pos_y`).

**`src/db/schema.ts`**
- `promotion_section`: `grid_cols` default **8**, `grid_rows` default **4**, `display_type` default `'tiles'`.
- `promotion`: `title NOT NULL`, `subtitle?`, `image_url?`, `link?`, `tile_type` default `'image'`, `width` default 1, `height` default 1, `pos_x` default 0, `pos_y` default 0, `is_active`, `branch_id?`.
- `promotion_image` exists only in migration 0004 SQL (not in schema.ts): `id, promotion_id (FK CASCADE), url, alt, sort_order, is_primary, created_at`.

**Seeded reality check** (`scripts/seed-catalog.ts`): sections seeded as **8×4** (`promo-hero` 8×4, catalog top/bottom 8×1, home top/bottom 8×2) with promos up to `w:8, h:4, x:0, y:0`. The admin UI only offers 1–4 cols / 1–3 rows — **the admin page today cannot even represent the seeded 8×4 hero** (and `TilesPromo` public hardcodes 4). The editor must support the real range.

### 1.4 Products image pipeline (the reference to reuse)

**`src/lib/image.ts`** — `processImage(file)` (canvas): validates type (png/jpeg/webp) + ≤5MB, resizes ≤1000×1000 preserving aspect, `toBlob` WebP 80%. `IMAGE_CONFIG` constants. Browser-only (dynamic-imported).

**`src/lib/image-utils.ts`** — the generic single-source layer:
- `uploadImage(file)` → `POST /api/upload` → `UploadResult`.
- `uploadImageBlob(blob, name)` → wraps blob as `<name-without-ext>.webp` File → `uploadImage`.
- `uploadAndAssociate(entityType, entityId, blob, name, options)` → upload + `associateImage`.
- `associateImage(entityType, entityId, url, apiUrl?, alt?, options?)` → `POST /api/{entityType}/{entityId}/images`.
- `replaceImage(...)` → `PUT /api/{entityType}/{entityId}/images/{imageId}`.
- `deleteImage(entityType, entityId, imageId)` → `DELETE /api/{entityType}/{entityId}/images/{imageId}` (association only).
- `deleteUploadedFile(filename)` → `DELETE /api/upload/:filename`, **best-effort (swallows errors)** — the R2 cleanup companion to `deleteImage`.
- `updateImageMetadata`, `fetchEntityImages(entityType, entityId)` → `GET /api/{entityType}/{entityId}/images`.
- `buildImagePayload`, `resolveApiUrl` helpers.

**`products.astro` delete pattern (the exact reference)** — `confirmDelete()`: `deleteImage('products', id, imageId)` (association) **+** `deleteUploadedFile(extractFilename(url))` (R2, best-effort). Gallery new images upload at **save time** (not per click). Primary upload also at submit (`uploadImageBlob` then `associateImage` with `is_primary: 1`).

**`src/lib/image-types.ts`** — `GalleryImage { id, url, alt, sort_order, is_primary }`, `UploadResult { success, url?, error? }`, `ImageAssociationPayload`.

**`src/components/ImageUploader.astro`** — used by `AdminProductForm.astro` via `(window).__processedImage` global; the gallery pattern (add/reorder/primary/delete) lives in `products.astro` + `src/lib/admin-gallery.ts` (pure functions `addImage`/`removeImage`/`setPrimary`) + `gallery-utils.ts`.

**Confirmed gap (user's requirement #3)**: deleting/replacing a PROMO image today does **not** remove the R2 object. Products do `deleteImage` + `deleteUploadedFile`; promos do neither (and can't even remove an image from an existing promo without blocking save).

## 2. Gaps

| # | Gap | Evidence | Impact |
|---|-----|----------|--------|
| G1 | **posY is write-only** — DB has it, POST/PUT accept it, but GET never returns it | `lib/promotions.ts` SELECT omits `pos_y`; `rowToPromotion` has no `pos_y` | Editing a promo resets posY to 0; public tiles ignore it; a true 2D grid cannot be represented |
| G2 | **Promo image delete/replace orphans R2** | Front never calls `deleteImage`/`deleteUploadedFile` for promos; backend `DELETE /api/promotions/:id/images/:imageId` deletes only the row; ✕ button blocks save | Storage leak + broken UX |
| G3 | **Per-interaction server calls** (grid selects, display type, every modal save) | `saveSectionGrid`, `display-type-select` handler, modal submit | Not WYSIWYG-local; requirement #2 wants a single Save |
| G4 | **Flat-index tile model** — tiles derive row from `position/gridCols`, `pos_x` doubles as order | `promo-preview.ts`/`TilesPromo.astro` | No real posX/posY WYSIWYG; overlaps unconstrained |
| G5 | **Admin grid cap 1–4 cols / 1–3 rows vs seeded 8×4** | `promotions.astro` selects; `seed-catalog.ts` | Editor must support 8×4; current UI misrepresents production sections |
| G6 | **Duplicated image logic** | `promotions.astro` inline vs `image-utils.ts`; imports `fetchEntityImages`/`deleteImage` unused | Requirement #3: single source of errors |
| G7 | Dead `#delete-overlay` modal; dead imports; `tile-options` hidden for non-tiles but per-type interactions absent | page source | Cleanup opportunity during rewrite |
| G8 | `TilesPromo` public hardcodes `gridCols=4` while preview uses section `grid_cols` | `TilesPromo.astro:23` vs `promo-preview.ts:46` | Public catalog may render differently than admin preview for non-4 sections |

## 3. Editor Design Options

### 3.1 Tile/canvas model (recommended)

- Treat `posX/posY` as **grid coordinates** (col/row, 0-based) and `width/height` as **spans**, inside a canvas of `grid_cols × grid_rows` cells (e.g. 8×4 seeded).
- Render a CSS grid of `grid_cols × grid_rows` cells as background guides; each tile absolutely positioned at `posX/posY` with `width/height` spans.
- Grid math MUST live in a pure lib module (e.g. `src/lib/promo-grid.ts`) — `dragToCell(pointer, grid)`, `resizeToSpans(handle, pointer, grid)`, `clampTile(tile, grid)`, collision detection — unit-testable, no DOM.
- Backend must start returning `pos_y` (G1 fix) so local state round-trips.

### 3.2 Interaction approach: vanilla Pointer Events vs interact.js

| Approach | Pros | Cons | Complexity |
|----------|------|------|------------|
| **Vanilla Pointer Events** (pointerdown/move/up + `setPointerCapture`, `touch-action: none` on handles) | Zero deps (fits zero-cost/no-deps leanings); full mouse+touch+pen coverage; `setPointerCapture` keeps drag stable; grid math stays pure/testable | Hand-rolled drag state machine (~150–250 lines) | Medium |
| interact.js | Tiny, touch-first, framework-agnostic; handles drag/resize gestures out of the box | Adds a runtime dependency against the project's zero-dep convention; gesture→grid math still must be written; harder to unit-test the pure parts; upkeep | Low–Med |

**Recommendation: vanilla Pointer Events + pure `promo-grid.ts`.** The project convention is pure functions in `lib/` for testability, and the grid math is the risky part — a dependency can't unit-test cleanly, whereas Pointer Events on absolutely-positioned tiles with `touch-action: none` is a well-trodden pattern (~150 lines). interact.js buys gesture plumbing the grid math still has to be written around, at the cost of the zero-dep rule.

### 3.3 Local state + Save architecture

**Store**: a client-side module holding `sections`, `selectedSection`, `promotions` as a **local working copy + dirty snapshot**:
- Load once from server (current behavior) → snapshot for revert.
- Every interaction mutates local state only (drag → new posX/posY; resize → new width/height; reorder → array order; text edits → fields; image add/replace/remove → blob/url state) and marks dirty.
- One `Guardar` button (disabled when clean) commits everything; `Cancelar/Revertir` reloads from server; `beforeunload` guard when dirty.

**Save strategy: loop existing PUTs vs batch endpoint**

| Option | Pros | Cons |
|--------|------|------|
| **A. Loop existing PUTs** (`PUT /api/promotions/:id` per promo + `PUT /api/promotion-sections/:id`) | No backend change; reuses tested endpoints | N round-trips; **non-atomic** (partial failure leaves mixed state); order-dependent reorder is awkward (posX renumbering race) |
| **B. Batch endpoint `PUT /api/promotion-sections/:id/promotions`** | 1 round-trip; atomic (single D1 batch); reorder = one payload; section grid/displayType + promotions in one commit | New backend surface + tests; payload schema work |

**Recommendation: Option B (batch endpoint).** The user's core requirement is "one Save commits everything" — a loop of N independent PUTs cannot be atomic (a failure mid-loop leaves a half-saved layout), and reorder semantics (posX renumbering) are much safer server-side in one transaction. Backend test surface is small (one zod schema + one handler + happy/failure tests, mirroring existing `promotions-post.test.ts` patterns). Payload proposal:

```
PUT /api/promotion-sections/:id/promotions   (admin)
{
  gridCols?: number, gridRows?: number, displayType?: string,
  promotions: [ { id?, title, subtitle, imageUrl, link, posX, posY, width, height, isActive } ],
  deletePromotionIds?: string[]
}
```
`id` present → update, absent → create. Runs in one D1 batch. **Image uploads stay client-side at save time** (upload blobs via `uploadImageBlob` first, then include the returned URLs in the batch; R2 delete via `deleteUploadedFile` for removed images — same as products).

### 3.4 Per display type

| Type | Interaction | Editor surface |
|------|-------------|----------------|
| `tiles` | Full drag + resize | Grid canvas (posX/posY/width/height), click tile → edit modal (image/title/link/description) |
| `carousel` / `split` / `ribbon` | Drag to reorder | Ordered list (or horizontal strip) with drag handles → array order → posX renumber on save |
| `hero` / `banner` | Simple edit | Single/first-item form; no grid math |
| All | Live preview | `buildPromoPreviewHtml()` re-rendered from **local state** (must switch tiles to posX/posY model) |

### 3.5 Touch specifics

- Pointer Events unify mouse/touch/pen; `touch-action: none` on tiles + handles prevents scroll/zoom hijack.
- Handles need ≥44px hit area (project a11y convention already targets 44px on mobile).
- Viewport meta already present in `BaseLayout.astro` (`width=device-width, initial-scale=1`).
- **E2E touch**: Playwright needs `hasTouch: true` context/device emulation for `page.touchscreen.tap`; drag/resize on touch can be driven via pointer-event dispatch (`page.evaluate` dispatching pointerdown/move/up with `pointerType: 'touch'`) or Playwright's touchscreen + CDP. Plan: one spec with a `hasTouch: true, isMobile: true` context project (or per-test browser context override).

## 4. Recommended Architecture (summary for design phase)

1. **Front — pure grid lib** `src/lib/promo-grid.ts` (+ tests): types `GridTile { id, posX, posY, width, height }`, `Grid { cols, rows }`; functions `dragToCell`, `resizeToSpans`, `clampTile`, `detectCollisions` (overlap warning — overlaps remain allowed per current model, or clamped per decision), `renumberOrder`.
2. **Front — editor store** `src/lib/promo-editor.ts` (+ tests): local working copy of section + promotions, dirty tracking, snapshot/revert, save-payload builder (batch shape), image-state transitions reusing `promo-upload.ts` semantics.
3. **Front — rewrite `promotions.astro`**: grid canvas editor for tiles, reorder list for carousel/split/ribbon, simple edit for hero/banner; single Save/Cancel; `beforeunload` guard; live preview from local state; **reuse `image-utils.ts` exclusively** (upload/associate/delete/deleteUploadedFile/fetchEntityImages) and `processImage`.
4. **Front — `promo-preview.ts` + `TilesPromo.astro`**: switch tiles to posX/posY model; `TilesPromo` reads `sectionInfo.gridCols` (fix G8).
5. **Back — `lib/promotions.ts` + routes**: return `pos_y` in GET responses (G1); add batch endpoint `PUT /api/promotion-sections/:id/promotions` (G3); keep existing endpoints for compatibility.
6. **E2E**: mouse + touch coverage for drag/resize/reorder/save/revert/unsaved-guard; image delete confirms R2 cleanup (via `deleteUploadedFile` mock-verify or API check).

## 5. Test Surface

**Existing to extend/repair**
- Front unit: `src/__tests__/promo-preview.test.ts` (tiles flat-index assertions will need updating to posX/posY), `promo-upload.test.ts`, `promotion-wall.test.ts`, `image-upload-central.test.ts` (image-utils).
- Back unit: `promotions-post.test.ts`, `promotion-sections-display-type.test.ts`, `promotion-images.test.ts` (entity-images factory), `src/lib/promotions.test.ts`.
- E2E: `e2e/admin/flows/promotions.spec.ts` (5 tests: list, display-type switch, create, edit, delete). Note `playwright.config.ts` uses `reuseExistingServer: false` on `:8787` (RATE_LIMIT_DISABLED + ENVIRONMENT=test flags) and `:4321` — **running e2e requires stopping the user's dev servers**.

**To add**
- `promo-grid.test.ts`: drag→cell, resize→span, clamp within grid bounds, collision, reorder renumbering.
- `promo-editor.test.ts`: dirty tracking, snapshot/revert, save-payload builder, unsaved-guard trigger, image state transitions.
- Back: batch-endpoint tests (schema validation, create+update+delete in one payload, 404 section, auth guard).
- E2E mouse: drag a tile → save → reload → persisted posX/posY; resize handles; reorder carousel/split/ribbon; revert discards; beforeunload dialog appears when dirty.
- E2E touch (hasTouch context): same drag/resize/reorder via pointer-event dispatch or touchscreen.

## 6. Risks

- **G1 model change ripples**: switching tiles from flat `position` to posX/posY touches `promo-preview.ts`, `TilesPromo.astro`, backend GET shape, and e2e assertions — must land coherently (design phase should decide flat-index backward-compat shim vs full switch; seeded data is already x/y-based, so a full switch is feasible).
- **Batch endpoint is new API surface**: needs rate-limit/auth parity with existing admin routes; partial-failure semantics (whole batch rolls back).
- **E2E infra**: e2e run requires stopping dev servers (existing constraint) — touch project adds a second browser context.
- **Scope creep**: the page is 982 lines of vanilla JS; the rewrite is the bulk of the change (review budget 800 lines → likely **chained PRs** recommended unless size:exception already accepted, per session preflight).
- **posX doubles as order** (backend `ORDER BY pos_x`): reorder and tiles share the column — batch save must renumber posX consistently for non-tiles types.

## 7. Non-Goals (out of scope unless proposal expands)

- No new DB tables/migrations (existing `pos_x/pos_y/width/height` + `promotion_image` suffice).
- No per-interaction autosave; no undo history beyond snapshot/revert.
- No change to public catalog rendering contract beyond the tiles gridCols fix (G8).
- No new framework (no React/Vue); vanilla JS per project convention.
