# Proposal: Promo Visual Editor

## Intent

`/admin/promotions` forces typing numeric posX/posY/width/height in a modal; grid caps (4×3) misrepresent seeded 8×4 sections; `pos_y` is write-only. Make layout editing visual and local: drag/resize on a canvas, reorder strips, one "Guardar" commit, products' image pipeline, mouse+touch.

## Scope

### In Scope
1. `src/lib/promo-grid.ts` — `dragToCell`, `resizeToSpans`, `clampTile`, `detectCollisions`, `renumberOrder` (+tests)
2. `src/lib/promo-editor.ts` — working copy, dirty, snapshot/revert, undo/redo, save-payload builder (+tests)
3. Rewrite `admin/promotions.astro`: tiles canvas, reorder strip, simple edit; Guardar/Cancelar; beforeunload guard; 44px handles; Pointer Events
4. `promo-preview.ts` + `TilesPromo.astro` → posX/posY + section `gridCols` (G8)
5. Images via `image-utils.ts`; remove/replace deletes R2 (G2)
6. Backend GET + public return `pos_y` (G1)
7. Batch `PUT /api/promotion-sections/:id/promotions` — atomic D1 batch: grid/displayType + upserts + deletes; returns state; requireAdmin+zod
8. E2E mouse+touch (hasTouch): drag/resize/reorder/save/revert/guard + R2 proof

### Out of Scope
- New display types — deferred: perfect the 6 existing first
- DB migrations; new deps; autosave; undo across save; multi-section
- Public contract beyond the G8 tiles fix

## Capabilities

### New Capabilities
- `promotion-management`: editor UX, local save, per-type interactions, batch endpoint, `pos_y` round-trip, image lifecycle, tiles fix

### Modified Capabilities
- `admin-api-security`: batch route joins requireAdmin+zod matrix
- `e2e-testing`: touch-input coverage (hasTouch)
- `admin-responsive`: "Promo Preview Grid Scaling" reconciled with canvas

## Approach

Pointer Events over a `grid_cols×grid_rows` canvas; tiles at posX/posY with width/height spans. Local edits only; Guardar sends one batch (uploads deferred; R2 best-effort). Non-tiles reorder → posX renumber in batch. Preview from local state.

## Decisions

- Interaction lib: vanilla Pointer Events (zero-dep)
- Save strategy: batch endpoint (atomic, 1 round trip)
- Model switch: full posX/posY; no migration; old endpoints compat
- Collisions: warn, allow (no dead-end states)
- Cheap extras in: undo/redo, arrows/Esc/Delete, duplicate, add-on-empty, snap+grid lines+hint

## Affected Areas

Front: `promotions.astro` · `promo-grid.ts`/`promo-editor.ts` · `promo-preview.ts`/`promo-upload.ts`/`TilesPromo.astro`. Back: `lib/promotions.ts`, `routes/promotions.ts`, `routes/public.ts` + batch route.

## Risks

- Model ripple (preview/public/e2e) — Med: land coherently; tests in same change
- New API surface — Med: auth/zod parity; batch rollback; tests
- posX doubles as order — Med: server-side renumber in batch
- 982-line rewrite vs 800-line budget — High: size:exception accepted; trim in design

## Rollback Plan

No migrations. Batch + `pos_y` additive; old clients unaffected. Revert commits restore old editor; remove route. Either order safe.

## Dependencies

None external. Products' image pipeline reused as-is.

## Success Criteria

- [ ] Drag/resize/reorder persist across save + reload (posX/posY round-trip)
- [ ] Zero per-interaction network calls; one Guardar commit
- [ ] Image remove/replace deletes the R2 object
- [ ] Mouse + touch e2e green; `npm test` green both repos
- [ ] Public tiles use section `gridCols` + posX/posY
