# Promotion Management Specification

## Purpose

Visual, local-first promotion management: grid-canvas tile editor, reorder strip, simple edit, one batch commit, products' image pipeline, `pos_y` round-trip.

## Requirements

### Requirement: Grid Canvas Editor (tiles)

The tiles editor MUST render a `grid_cols × grid_rows` canvas with grid-lines overlay; tiles MUST be absolutely positioned at posX/posY spanning width/height cells. Drag MUST snap posX/posY to cells; handle drag MUST clamp width/height to bounds; click MUST open the edit modal (image/title/link/description). Overlaps MUST warn but stay allowed. Grid math MUST be pure in `src/lib/promo-grid.ts` (`dragToCell`, `resizeToSpans`, `clampTile`, `detectCollisions`). A one-time onboarding hint MUST explain drag/resize/reorder.

- GIVEN an 8×4 section with a tile at (2,1,2,1) WHEN the editor loads THEN the tile renders at that pos/size on the grid
- GIVEN a tile dragged to another cell WHEN released THEN posX/posY snap to that cell
- GIVEN a corner handle dragged THEN width/height spans update, clamped to bounds
- GIVEN a tile dropped on another THEN a collision warning shows AND both tiles keep positions
- GIVEN the first load THEN the onboarding hint shows and dismisses

### Requirement: Reorder Strip and Simple Edit

Carousel/split/ribbon MUST present a reorder strip; dragging MUST change array order and renumber posX on save. Hero/banner MUST present a simple edit form without grid math.

- GIVEN a carousel with 3 promos WHEN the 3rd is dragged to position 1 and saved THEN the strip reorders AND posX become 0, 1, 2
- GIVEN a hero section WHEN the editor loads THEN only the simple edit form shows

### Requirement: Local State, Dirty Tracking, and Single Commit

Editing MUST be local-state-only with zero per-interaction network calls. Dirty tracking MUST gate Guardar (disabled while clean) which MUST send ONE batch PUT; Cancelar/Revertir MUST restore the snapshot; `beforeunload` MUST warn when dirty. Undo/redo (Ctrl/Cmd+Z/Y), arrow nudge, Esc cancel, Delete remove, duplicate tile, and add-on-empty-cell MUST be supported.

- GIVEN a clean editor THEN Guardar is disabled
- GIVEN local edits WHEN Guardar is clicked THEN exactly one batch PUT fires AND the response becomes the new snapshot
- GIVEN local edits WHEN Cancelar is clicked THEN state returns to the snapshot AND dirty clears
- GIVEN a dirty editor WHEN leaving THEN a `beforeunload` warning shows
- GIVEN a tile just dragged WHEN Ctrl/Cmd+Z THEN it returns to its prior cell AND Ctrl/Cmd+Y re-applies
- GIVEN a selected tile WHEN Delete THEN it leaves the working copy AND Duplicate adds a copy on the first free cell
- GIVEN an empty cell WHEN add is invoked THEN a new 1×1 tile is created there

### Requirement: Mouse and Touch Input

Canvas interactions MUST use Pointer Events with `touch-action: none`; handles MUST have ≥44px hit areas; touch MUST behave identically to mouse.

- GIVEN a touchscreen WHEN a tile is dragged via touch THEN it follows the pointer AND the page does not scroll
- GIVEN a resize handle THEN its hit area is ≥44×44px

### Requirement: Promotion Image Lifecycle

Promotion images MUST use `processImage` (≤1000×1000 WebP 80%) and `image-utils.ts` exclusively (`uploadImageBlob`, `associateImage`, `deleteImage`, `deleteUploadedFile`). Replace/remove MUST delete the old R2 object via `deleteUploadedFile` (products pattern). `promo-upload.ts` duplication and dead `#delete-overlay` HTML MUST be removed.

- GIVEN an existing promo image WHEN replaced and Guardar is clicked THEN the new image uploads AND the old R2 object is deleted
- GIVEN an existing promo image WHEN removed and Guardar is clicked THEN the association is deleted AND the R2 object is deleted
- GIVEN a promo page source audit THEN no upload/associate/delete logic lives outside `image-utils.ts` AND no `#delete-overlay` markup exists

### Requirement: Promotion API Contract (backend)

`GET /api/promotions` and `/api/public/promotions` MUST return `pos_y`. New admin-only `PUT /api/promotion-sections/:id/promotions` MUST atomically apply gridCols/gridRows/displayType, upsert promotions (id → update, absent → create), delete `deletePromotionIds`, renumber posX, and return the saved section + promotions. Existing POST/PUT/DELETE MUST stay compatible. Route MUST require admin, validate with zod, and set timestamps.

- GIVEN a promo stored with posY=2 WHEN `GET /api/promotions` THEN the response includes `pos_y: 2`
- GIVEN 2 updates, 1 create, and 1 delete WHEN an admin calls the batch PUT THEN one D1 batch applies all AND returns the saved section + promotions
- GIVEN a non-admin session WHEN the batch PUT THEN 403 AND no rows are written
- GIVEN an invalid payload (e.g. missing title) WHEN the batch PUT THEN 400 AND no rows are written
- GIVEN the batch endpoint exists WHEN existing `POST /api/promotions` or `PUT /api/promotions/:id` is called THEN it still works unchanged
