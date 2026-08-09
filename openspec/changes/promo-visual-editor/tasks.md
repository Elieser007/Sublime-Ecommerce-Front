# Tasks: Promo Visual Editor

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines (front) | ~2100–2400 |
| Estimated changed lines (back) | ~450–550 |
| Estimated changed lines (total) | ~2600–2900 |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |
| Suggested split | Single PR (size:exception accepted); land as 10 reviewable work-unit commits |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

> Night run pre-approved: maintainer-accepted size:exception; orchestrator does NOT stop for splitting. Units below are commit slices within the single PR.

### Suggested Work Units

| Unit | Goal | Focused test command | Runtime harness | Rollback boundary |
|------|------|----------------------|-----------------|-------------------|
| U1 | `promo-grid.ts` pure math | `npm test -- src/__tests__/promo-grid.test.ts` (front) | N/A — pure lib, vitest is harness | revert lib+test; no dependents |
| U2 | `promo-editor.ts` store | `npm test -- src/__tests__/promo-editor.test.ts` (front) | N/A — pure lib | revert lib+test |
| U3 | `promo-canvas.ts` renderer | `npm test -- src/__tests__/promo-canvas.test.ts` (front) | N/A — pure lib | revert lib+test |
| U4 | `promotions.astro` rewrite | `npm test -- src/__tests__/admin-promo-editor.test.ts` (front) | `npm run dev` + manual canvas drag/resize/reorder at :4321 | revert page; old editor intact |
| U5 | Image flow (`image-utils.ts`) | `npm test` (front) + grep audit (no `promo-upload`, no `#delete-overlay`) | `npm run dev` both repos + manual replace/remove; R2 proof gated by U9 | revert image wiring; restore `promo-upload.ts` |
| U6 | Preview/public posX/posY + G8 | `npm test -- src/__tests__/promo-preview.test.ts` (front) | `npm run build` + inspect public tiles section | revert preview/Tiles/PromotionWall |
| U7 | Back `pos_y` round-trip | `npm test -- src/lib/promotions.test.ts src/routes/public-promotions.test.ts` (back) | `npm run dev` (wrangler) + `curl /api/promotions` | revert `lib/promotions.ts` additions (additive) |
| U8 | Back batch PUT endpoint | `npm test -- src/routes/__tests__/promotion-batch.test.ts` (back) | `npm run dev` + curl admin `PUT /api/promotion-sections/:id/promotions` | revert route additions (additive; old endpoints untouched) |
| U9 | E2E mouse+touch | `npm exec playwright test e2e/admin/flows/promotions.spec.ts e2e/admin/flows/promo-editor-touch.spec.ts` | Playwright :4321 (orchestrator stops dev servers first) | revert e2e specs (no prod impact) |
| U10 | Polish + docs | `npm test` both repos + `npm run build` (front) + full admin playwright | `npm run build` + preview | revert docs only |

## Phase 1: Pure libs — grid, store, canvas (TDD RED→GREEN)

- [x] **1.1 [U1 RED]** Write `src/__tests__/promo-grid.test.ts` (front): `clampTile` bounds (posX∈[0,cols-w], w∈[1,cols], y/h same); `dragToCell` integer snap + clamp; `resizeToSpans` all 8 handles, opposite-corner anchor, ≥1, in-bounds, full-grid; `detectCollisions` touch/overlap/self-exclusion (warn-only); `renumberOrder` → posX 0..n-1; `autoSuggestPosition` empty/full/row-major; `tilePlacement` 1-based CSS coords. Refs: PM-1, design §Interfaces, AD "Coordinate rounding". Verify: `npm test -- src/__tests__/promo-grid.test.ts` — expect RED.
- [x] **1.2 [U1 GREEN]** Create `src/lib/promo-grid.ts` (pure, no DOM): `GridTile`, `Grid`, `ResizeHandle`, all 8 fns per §Interfaces. Dep: 1.1. AC: 1.1 green.
- [x] **2.1 [U2 RED]** Write `src/__tests__/promo-editor.test.ts` (front): `createEditorState` from `PromotionResponse[]`; `isDirty` false clean / true after move-edit; `imageBlob → '<blob>'` projection; `revert` restores snapshot + clears history; `toSavePayload` shape (null `imageUrl`, `deletePromotionIds`, `resolvedUrls` re-key); `applySavedResponse` re-key ids/clear blob+deleted/new snapshot; move/remove/duplicate; `pushHistory` cap 50 (oldest evicted); undo/redo null at ends; `shouldWarnBeforeUnload`; `extractFilename`. Refs: PM-3, PM-5, AD "Undo granularity"/"Batch response sync". Verify: RED.
- [x] **2.2 [U2 GREEN]** Create `src/lib/promo-editor.ts` per §Interfaces. Dep: 2.1. AC: 2.1 green.
- [ ] **3.1 [U3 RED]** Write `src/__tests__/promo-canvas.test.ts` (front): `clientToCell` floor semantics (floor snaps past cell origin); `cellSizeForGrid` desktop clamp 72–120 full-width + mobile fixed 80 overflow-x branches; tile HTML percent placement (`left: posX/cols*100%`, `top: posY/rows*100%`, `width/height` spans) + 8 handle elements; grid-lines overlay builder. Refs: PM-1, PM-4, AR-2, AD "Canvas sizing"/"Drag anchor". Verify: RED.
- [ ] **3.2 [U3 GREEN]** Create `src/lib/promo-canvas.ts` (pure geometry + HTML strings; no event binding). Dep: 3.1. AC: 3.1 green.

## Phase 2: Backend API — pos_y + batch route (TDD)

- [ ] **7.1 [U7 RED]** Extend `src/lib/promotions.test.ts` + `src/routes/public-promotions.test.ts` (back): `buildPromotionQuery` SELECT includes `pos_y`; `rowToPromotion` maps `pos_y`→`posY` (null→0); `PromotionResponse` gains `posY`; additive assert in public shape. Refs: PM-6 G1, design G1/file table. Verify: RED.
- [ ] **7.2 [U7 GREEN]** `src/lib/promotions.ts`: add `pos_y` to SELECT + `PromotionRow` + `rowToPromotion` + `PromotionResponse`. Dep: 7.1. AC: 7.1 green.
- [ ] **8.1 [U8 RED]** Create `src/routes/__tests__/promotion-batch.test.ts` (back, mirrors `promotions-post.test.ts` mock conventions): 403 client role; 400 missing title (no rows); 404 section; happy path 2 upd + 1 create + 1 delete → assert `DB.batch` stmt list + 200 via `buildPromotionQuery`/`formatSingleSection`; grid/display COALESCE UPDATE; stale-id 0-row no-op; cross-section DELETE scoped (`id AND section_id`); `imageUrl: null` allowed; rate-limit parity 30/min → 429. Refs: PM-6, AAS-1 (all 4 scenarios), design §Interfaces/Testing Strategy. Verify: RED.
- [ ] **8.2 [U8 GREEN]** `src/routes/promotions.ts`: `promotionBatchItemSchema` (`imageUrl (httpUrl|null)?` optional), `promotionBatchSchema`, `promotionsBatchRateLimit` (60s/30, session-user key), `PUT /api/promotion-sections/:id/promotions` — `requireAdmin` → `zValidator(zodErrorHook)` → limiter → SELECT section → stmts (COALESCE UPDATE; upsert with randomUUID; scoped DELETE; `normalizePublicImageUrl`) → `DB.batch` → 200 via `buildPromotionQuery`+`formatSingleSection`. Dep: 8.1, 7.2. AC: 8.1 green + `npm test` (back) for auth-matrix regression.

## Phase 3: Core editor page

- [ ] **4.1 [U4 RED]** Write `src/__tests__/admin-promo-editor.test.ts` (front, static-source pattern): page imports promo-grid/editor/canvas + `image-utils`; canvas registers pointerdown (drag/resize), keydown Esc/arrows/Delete/Ctrl+Z+Y, Guardar disabled while clean, Cancelar/Revertir wired, `beforeunload` when dirty, 44px handle class, onboarding hint element; no `promo-upload` import, no `#delete-overlay`. Refs: PM-1..PM-4, AR-2, design file table. Verify: RED.
- [ ] **4.2 [U4 GREEN]** Rewrite `src/pages/admin/promotions.astro`: grid-lines canvas + percent tiles + 8 handles; pointer session (setPointerCapture, grab-offset→`dragToCell`, `resizeToSpans`, move threshold); keyboard nudge/cancel/delete/undo-redo via store; reorder strip (carousel/split/ribbon) + simple edit (hero/banner); local-only edits, zero network; single Guardar (disabled clean) → `toSavePayload` → fetch PUT (mock-friendly); Cancelar/Revertir → `revert`; `beforeunload` via `shouldWarnBeforeUnload`; onboarding hint (once); collision hint (warn-only). Dep: 4.1, U1–U3. AC: 4.1 green.
- [ ] **4.3 [U4 GREEN]** Same page: tile click → edit modal (title/subtitle/link/isActive/spans, mobile-fit); duplicate + add-on-empty via `autoSuggestPosition`; grid/display local selects → `store.section`; preview re-render from local state (existing `promo-preview`; U6 upgrades tiles). Dep: 4.2. Verify: `npm test` (front) + `npm run build`.

## Phase 4: Image flow + preview/public renderer

- [ ] **5.1 [U5 RED]** Extend `admin-promo-editor.test.ts` (or new `src/__tests__/admin-promo-image.test.ts`): page uses `processImage` (≤1000×1000 WebP 80%) + `image-utils` (`uploadImageBlob`/`associateImage`/`deleteImage`/`deleteUploadedFile`); save-time upload → `resolvedUrls`; replace/remove → `deleteUploadedFile(old url)` + `deleteImage(assoc)`; batch-failure orphan guard deletes blobs uploaded this save; source audit: `promo-upload.ts` + `#delete-overlay` absent. Refs: PM-5 (3 scenarios), design Data Flow. Verify: RED.
- [ ] **5.2 [U5 GREEN]** Delete `src/lib/promo-upload.ts` + `src/__tests__/promo-upload.test.ts`; wire modal image state (preview URL + `imageBlob`); save flow: per-blob `uploadImageBlob`→`associateImage`→`resolvedUrls`→PUT→`applySavedResponse`→cleanup replaced/removed/deleted URLs; batch failure → best-effort delete of new blobs; strip dead `#delete-overlay` + unused imports. Dep: 5.1, U4, U2. AC: `npm test` + grep clean.
- [ ] **6.1 [U6 RED]** Extend `src/__tests__/promo-preview.test.ts` (front): tiles branch → `grid-column: posX+1 / span width; grid-row: posY+1 / span height`; legacy rows default posY 0; `TilesPromo` `gridCols` from `sectionInfo.gridCols || 4` (G8) via `tilePlacement`; `PromotionWall` passes `gridCols`+`posY` through. Refs: PM-1, AR-1, design G8/file table. Verify: RED.
- [ ] **6.2 [U6 GREEN]** `src/lib/promo-preview.ts` `buildTiles` → `tilePlacement`-based; `src/components/promo/TilesPromo.astro` real `gridCols` + row from `posY`; `src/components/PromotionWall.astro` pass-through. Dep: 6.1, U1. Verify: `npm test -- src/__tests__/promo-preview.test.ts src/__tests__/promotion-wall.test.ts`.

## Phase 5: E2E — mouse + touch

- [ ] **9.1 [U9 RED]** Rewrite `e2e/admin/flows/promotions.spec.ts` (local-save model): drag→Guardar→reload→posX/posY; resize→reload→spans; carousel reorder→reload order; revert restores; `beforeunload` dialog; R2 proof (`page.request.get(old upload URL)` → 404 after replace/remove). Refs: E2E-1 scenarios 1,2,4,5,6; design Testing Strategy. Verify: RED.
- [ ] **9.2 [U9 RED]** Create `e2e/admin/flows/promo-editor-touch.spec.ts`: `test.use({ hasTouch: true, isMobile: true, viewport: '375x667' })`; drag/resize via `page.evaluate` dispatching PointerEvents `pointerType:'touch'`; assert same snapped cell as mouse; 8-col canvas scrolls horizontally, document has no overflow, ≥44px targets. Add `dispatchPointerDrag`/touch-context helper to `e2e/admin/helpers.ts`. Refs: E2E-1 scenario 3, AR-2. Verify: RED.
- [ ] **9.3 [U9 GREEN]** Fix surfaced bugs until both specs green (needs U4, U5, U6, U8 landed — backend batch live). Gate: `npm test` (front) + `npm run build` + `npm exec playwright test e2e/admin/flows/promotions.spec.ts e2e/admin/flows/promo-editor-touch.spec.ts` (orchestrator stops dev servers first).

## Phase 6: Polish + docs

- [ ] **10.1 [U10]** Resolve design Open Questions: collision-warning presentation (toast vs inline chip) + onboarding hint copy; verify grid-lines overlay and 44px touch targets on 375px. Refs: AR-2, design Open Questions. Verify: `npm run dev` manual pass.
- [ ] **10.2 [U10]** Update `AGENTS.md` (front) file listing if `promo-upload.ts` removal/`promo-*` additions change structure; README/help-text only if needed. Verify: docs build.
- [ ] **10.3 [U10 Gate]** `npm test` both repos green + `npm run build` (front) + `npm exec playwright test` full admin suite. Dep: all.

## Commit Guidance

One conventional commit per unit, tests + code together (work-unit-commits): e.g. `feat(front): promo-grid pure grid math`, `feat(back): batch promotions endpoint`, `feat(front): visual promo editor`, `test(front): promo editor e2e mouse+touch`. Backend commits independent (`Sublime-Ecommerce-Back` repo).
