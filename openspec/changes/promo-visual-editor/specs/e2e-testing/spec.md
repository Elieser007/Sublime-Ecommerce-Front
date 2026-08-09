# Delta for E2E Testing

## ADDED Requirements

### Requirement: Promo Editor Mouse and Touch E2E

The e2e suite MUST cover the visual promo editor with BOTH mouse and touch input contexts. Mouse coverage MUST include drag, resize, reorder, save, revert, and the unsaved-changes guard. Touch coverage MUST run in a `hasTouch: true` context (or pointer-event dispatch with `pointerType: 'touch'`) and MUST verify drag/resize/reorder behave identically to mouse. The suite MUST prove image replace/remove deletes the R2 object.

#### Scenario: Mouse drag persists posX/posY

- GIVEN a logged-in admin on `/admin/promotions` with a tiles section
- WHEN a tile is dragged to a new cell and Guardar is clicked
- THEN the page reloads AND the tile renders at the new posX/posY

#### Scenario: Mouse resize persists spans

- GIVEN a tile on the canvas
- WHEN its corner handle is dragged and Guardar is clicked
- THEN the saved width/height spans match the new size after reload

#### Scenario: Touch drag matches mouse

- GIVEN a `hasTouch: true` context
- WHEN a tile is dragged via touch pointer events
- THEN the tile moves to the same snapped cell as a mouse drag would

#### Scenario: Reorder persists

- GIVEN a carousel/split/ribbon section
- WHEN an item is reordered in the strip and saved
- THEN the saved order matches after reload

#### Scenario: Unsaved-guard appears

- GIVEN a dirty editor (an edit made, not saved)
- WHEN the page is navigated away
- THEN a `beforeunload` dialog is shown

#### Scenario: R2 deletion proven

- GIVEN a promo image is replaced or removed and Guardar is clicked
- WHEN the previous upload URL is checked
- THEN the R2 object no longer exists (404 or `head` confirms absence)
