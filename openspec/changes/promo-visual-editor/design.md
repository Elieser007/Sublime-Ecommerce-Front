# Design: Promo Visual Editor

## Technical Approach

Local-first WYSIWYG editor: a pure grid-math lib (`promo-grid.ts`), a pure local store (`promo-editor.ts`), and a thin renderer (`promo-canvas.ts`) driven by a pointer-event state machine in the rewritten `promotions.astro`. Zero per-interaction network calls; one Guardar commit via a new atomic D1-batch endpoint. `pos_y` becomes read/write (G1), tiles render from posX/posY (G8), images reuse the products pipeline (G2). Specs: promotion-management (all 6 reqs), admin-api-security (batch), e2e-testing (mouse+touch), admin-responsive (grid scaling).

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|---|---|---|---|
| Canvas sizing | Fluid cells everywhere vs fixed cell + scroll | Fluid shrinks 8-col tiles below usable size on 375px (spec: MUST NOT) | Desktop (≥768px): cell = clamp(⌊availW/cols⌋, 72, 120)px, full width. Mobile: fixed 80px cell, `overflow-x:auto` canvas. Tiles positioned in **percentages** of canvas (`left: posX/cols*100%`) so one renderer covers both; cell size only sets canvas width |
| Coordinate rounding | px float vs integer cells | Fractional cells drift on drag; pure math needs integers | All geometry in **integer cell units**; `clientToCell` uses `Math.floor`; floor snaps to next cell only past its origin |
| Undo granularity | Per pointermove vs per completed gesture | Per-move floods history (cap 50), useless steps | One history entry per **completed interaction** (pointerup, one arrow keydown, modal save, delete/duplicate). `e.repeat` keydowns coalesced (no per-repeat push) |
| Reorder semantics | Shared order field vs per-type | posX doubles as order; tiles need real 2D | tiles = free 2D (no renumber); carousel/split/ribbon = array order, `renumberOrder()` → posX 0..n-1 on save; hero/banner = simple edit form only |
| Batch response sync | Echo request vs re-query | Echo can lie (stale ids, defaults); re-query = server truth | Reuse `buildPromotionQuery`+`formatSingleSection` → response identical to `GET /api/promotions?section=`; `applySavedResponse` maps it to state + new snapshot |
| Grid/display selects | Instant PUT vs local edit | Instant PUT violates single-commit req | Local edits on `store.section`; preview + canvas re-render from working copy; Guardar sends them in the batch |
| Batch item `imageUrl` | Required vs optional/null | Image removal (G2) needs null; POST keeps required for compat | **Optional `(httpUrl \| null)`** in batch items — deviation from the schema sketch, required by the remove-image scenario |
| Pointer machine location | In page vs lib | Machine is DOM-lifecycle-bound (setPointerCapture, pointerId) | Cell geometry + renderer + sizing pure in `promo-canvas.ts`; the ~50-line session closure stays in the page script; state transitions call only pure fns |
| Drag anchor | Top-left snap vs grab-offset | Top-left snap jumps under finger | `dragToCell` treats `pointerCell` as **target top-left**; component subtracts grab offset (px→cell) before calling — lib stays pure |

## Data Flow

```
pointermove → clientToCell → dragToCell/resizeToSpans → store.promotions (working copy)
        → renderTileCanvasHtml + buildPromoPreviewHtml (local) — zero network
Guardar → uploadImageBlob(each imageBlob) ─┐
        → toSavePayload(state, urls) ──────┼─→ PUT /api/promotion-sections/:id/promotions
        → applySavedResponse → new snapshot ┘
        → cleanup: deleteImage(old assoc) + deleteUploadedFile(old url) [replaced/removed]
                   deleteUploadedFile(old url) [deleted promos — assoc dies via FK cascade]
        → batch failure: best-effort deleteUploadedFile on blobs uploaded this save (orphan guard)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/lib/promo-grid.ts` (front) | Create | Pure grid math (below) |
| `src/lib/promo-editor.ts` (front) | Create | Store: working copy, dirty, history, payload |
| `src/lib/promo-canvas.ts` (front) | Create | Tile-canvas HTML renderer, `clientToCell`, `cellSizeForGrid` |
| `src/pages/admin/promotions.astro` (front) | Rewrite | Canvas + pointer machine + strip + simple edit + modal + guard; remove `#delete-overlay`, dead imports, `promo-upload.ts` usage |
| `src/lib/promo-preview.ts` (front) | Modify | `PromoPreview` gains `posY`; tiles branch renders `grid-column: posX+1/span w; grid-row: posY+1/span h` |
| `src/components/promo/TilesPromo.astro` (front) | Modify | `gridCols` from `sectionInfo.gridCols \|\| 4` (G8), row from `posY` |
| `src/components/PromotionWall.astro` (front) | Modify | Pass `gridCols` + `posY` through to TilesPromo |
| `src/lib/promo-upload.ts` + test (front) | Delete | Replaced by EditorPromotion image fields + `image-utils.ts` |
| `src/__tests__/promo-{grid,editor,canvas}.test.ts` (front) | Create | Unit tests |
| `src/__tests__/promo-preview.test.ts` (front) | Modify | tiles assertions → posX/posY |
| `src/lib/promotions.ts` (back) | Modify | SELECT + `PromotionRow` + `PromotionResponse` + `rowToPromotion` add `pos_y` |
| `src/routes/promotions.ts` (back) | Modify | Batch endpoint + `promotionBatchSchema` + limiter |
| `src/routes/__tests__/promotion-batch.test.ts` (back) | Create | Mirrors `promotions-post.test.ts` |
| `src/lib/promotions.test.ts`, `public-promotions.test.ts` (back) | Modify | Additive `posY` asserts |
| `e2e/admin/flows/promotions.spec.ts` (front) | Modify | Rewrite create/edit/delete + display-switch for local-save model |
| `e2e/admin/flows/promo-editor-touch.spec.ts` (front) | Create | `hasTouch: true` context, pointer-event dispatch |

## Interfaces / Contracts

```ts
// src/lib/promo-grid.ts — pure, no DOM
interface GridTile { id: string; posX: number; posY: number; width: number; height: number }
interface Grid { cols: number; rows: number }
type ResizeHandle = 'n'|'s'|'e'|'w'|'ne'|'nw'|'se'|'sw';
clampTile(tile: GridTile, grid: Grid): GridTile                    // posX∈[0,cols-w], w∈[1,cols], …
dragToCell(tile, cell: {x:number;y:number}, grid): GridTile        // target top-left, clamped
resizeToSpans(tile, cell, handle: ResizeHandle, grid): GridTile    // opposite corner anchored, ≥1, in bounds
detectCollisions(tiles: GridTile[], movedId: string): string[]     // warn-only, never blocks
renumberOrder(tiles: GridTile[]): GridTile[]                       // tiles[i].posX = i (array order)
autoSuggestPosition(grid, tiles): {x:number;y:number} | null       // first free cell, row-major
tilePlacement(tile): { col: number; row: number }                  // 1-based CSS grid coords
```

```ts
// src/lib/promo-editor.ts — pure
interface EditorPromotion { id: string|null; title: string; subtitle: string|null;
  imageUrl: string|null; link: string; posX: number; posY: number; width: number;
  height: number; isActive: boolean; imageId: string|null;        // assoc row (deleteImage)
  imageBlob: Blob|null; previousImageUrl: string|null; }          // pending upload / R2 delete target
interface EditorSection { id: string; name: string; slug: string; gridCols: number; gridRows: number; displayType: string }
interface PromoEditorState { section: EditorSection; promotions: EditorPromotion[]; deletedIds: string[] }
createEditorState(section, promotions: PromotionResponse[]): PromoEditorState
createSnapshot(s): PromoEditorState
isDirty(s, snap): boolean              // normalized projection; imageBlob → '<blob>'
revert(s, snap): PromoEditorState      // snap copy; clears history
toSavePayload(s, resolvedUrls?: Record<string,string|null>): { gridCols; gridRows; displayType;
  promotions: {id?,title,subtitle,imageUrl,link,posX,posY,width,height,isActive}[]; deletePromotionIds: string[] }
applySavedResponse(s, res: {section; promotions}): PromoEditorState  // re-key ids, clear blob/deleted
movePromotion(s, from, to) / removePromotion(s, id) / duplicatePromotion(s, id) / setSection(s, patch)
pushHistory(h, s): EditorHistory      // cap 50
undoEditor(h, s) / redoEditor(h, s): {state; history} | null
shouldWarnBeforeUnload(s, snap): boolean
extractFilename(url: string): string | null   // R2 key for deleteUploadedFile
```

```ts
// src/routes/promotions.ts (back)
promotionBatchItemSchema = { id?; title*; subtitle?; imageUrl: (httpUrl|null)?; link* (httpUrl);
  posX/posY: int≥0 default 0; width/height: int≥1 default 1; isActive? }
promotionBatchSchema = { gridCols?; gridRows?; displayType?;
  promotions[] default []; deletePromotionIds[] default [] }

PUT /api/promotion-sections/:id/promotions
  requireAdmin → zValidator(promotionBatchSchema, zodErrorHook) → promotionsBatchRateLimit
  1. SELECT section (404 if absent)
  2. statements: section COALESCE UPDATE (if any grid/display field present);
     per item — id? UPDATE … WHERE id=? AND section_id=? : INSERT (randomUUID, is_active 1);
     DELETE … WHERE id=? AND section_id=? per deletePromotionIds (scope guard);
     imageUrl normalized via normalizePublicImageUrl
  3. await DB.batch(stmts) — D1 batch is all-or-nothing: one failed statement rolls back the
     entire batch; that IS the rollback guarantee (no manual compensation). 0-row UPDATE on a
     stale id is not an error — response re-query converges state.
  4. 200 { section, promotions } via buildPromotionQuery(slug) + formatSingleSection
promotionsBatchRateLimit = createRateLimiter({ windowMs: 60_000, limit: 30, methods: ['PUT'],
  keyGenerator: session user id })  // parity with upload; satisfies the 429 scenario
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Front unit | `promo-grid`: drag snap+clamp, resize all-handle bounds/1×1/full-grid, collisions (touch/overlap/self-exclusion), renumber order, autosuggest empty/full/row-major, tilePlacement | `src/__tests__/promo-grid.test.ts`, RED→GREEN |
| Front unit | `promo-editor`: create→dirty→revert, payload shape incl. null imageUrl + deletePromotionIds, applySavedResponse re-sync, undo/redo + cap 50, move/remove/duplicate, extractFilename | `promo-editor.test.ts` |
| Front unit | `promo-canvas`: HTML geometry (percent placement, handles), `clientToCell` floor, `cellSizeForGrid` clamp/scroll branches | `promo-canvas.test.ts` |
| Front unit | `promo-preview` tiles posX/posY; TilesPromo logic via `tilePlacement`; dirty projection blob | updated `promo-preview.test.ts` |
| Back unit | `promotion-batch.test.ts` (mock prepare/bind/first/all/run/batch): 403 non-admin, 400 missing title, 404 section, happy path (2 upd + 1 create + 1 delete → assert `DB.batch` stmts + response), grid/display update, stale-id no-op, cross-section delete scoped; `posY` round-trip in `lib/promotions.test.ts` | mirrors `promotions-post.test.ts` conventions |
| E2E | mouse drag→save→reload posX/posY; resize→save→reload spans; reorder carousel; revert; beforeunload; R2 proof (`page.request.get(old upload URL)` → 404 after replace/remove) | rewritten `promotions.spec.ts` |
| E2E touch | `test.use({ hasTouch: true, isMobile: true, viewport: 375×667 })`; drag/resize via `page.evaluate` dispatching PointerEvents `pointerType:'touch'`; assert same snapped cell as mouse | new `promo-editor-touch.spec.ts` |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. The batch endpoint is an HTTP route protected by `requireAdmin`+zod+rate-limit (admin-api-security), not a command/shell boundary; no matrix rows are applicable and none are manufactured.

## Migration / Rollout

No migration. `pos_y` SELECT + batch route are additive; old POST/PUT/DELETE and public shapes unchanged (`position` alias kept; only `posY` added). Reverting the frontend commits restores the old editor; removing the route is safe. Image uploads stay client-side at save time; R2 cleanup is best-effort after the batch succeeds.

## Work Units (for sdd-tasks — TDD RED→GREEN per unit)

1. `promo-grid.ts` pure module + tests
2. Backend G1: `pos_y` in query/mapper/response + lib + public tests
3. `promo-editor.ts` store + tests
4. `promo-canvas.ts` renderer/geometry/sizing + tests
5. `promo-preview.ts` tiles posX/posY + TilesPromo/PromotionWall G8 + tests
6. `promotions.astro` rewrite: canvas + pointer machine (drag/resize/threshold/Esc/arrows/Delete/duplicate/collision hint)
7. Modal + reorder strip + simple edit + grid/display local selects + beforeunload guard
8. Image flow: modal image state, save-time upload/associate, R2 cleanup, delete `promo-upload.ts` + dead `#delete-overlay`
9. Backend batch endpoint: schema + handler + limiter + `promotion-batch.test.ts`
10. Save wiring: `toSavePayload`→PUT→`applySavedResponse` (unit tests mock fetch; **integration needs unit 9 landed** — e2e is the gate)
11. E2E: rewrite `promotions.spec.ts` (local-save model) + new mouse drag/resize/reorder/R2 + touch spec

Order follows the proposal; units 9 and 10 are independent until e2e, so backend batch can land before save wiring if task sequencing prefers it — both must be green before unit 11.

## Open Questions

- None blocking. Collision-warning presentation (toast vs inline chip) and hint-copy language are component-level; resolved during apply.
