# Delta for Admin Responsive

## MODIFIED Requirements

### Requirement: Promo Preview Grid Scaling

The promo preview grid SHALL render the section's real `gridCols × gridRows` from local editor state, replacing the fixed 1/2/4 responsive column counts. On viewports < 768px the editor canvas SHALL be touch-first with horizontal scrolling when the grid is wider than the viewport (e.g. 8-col sections); it MUST NOT rely on shrinking tiles below usable size.

(Previously: fixed responsive column counts of 1/2/4 with `minmax(250px, 1fr)` fluid fill, independent of the section's actual grid.)

#### Scenario: Preview matches section grid

- GIVEN a section with gridCols=8 and gridRows=4
- WHEN the editor loads
- THEN the preview renders an 8×4 canvas derived from local state

#### Scenario: Preview reflects local edits

- GIVEN a tile moved or resized in the editor
- WHEN the preview is inspected
- THEN it reflects the local state immediately, before save

#### Scenario: Wide grid scrolls on mobile

- GIVEN a viewport of 375px and an 8-col section
- WHEN the editor renders
- THEN the canvas scrolls horizontally within its container AND tiles and handles remain ≥44px usable

#### Scenario: Full grid on desktop

- GIVEN a viewport of 1440px and an 8-col section
- WHEN the editor renders
- THEN the full 8×4 grid is visible without horizontal scroll

## ADDED Requirements

### Requirement: Editor Usable on Small Screens

The promo editor MUST be usable on viewports < 768px: touch-first interactions, ≥44px targets, horizontal scroll for wide grids, and modals that fit the viewport without overflow.

#### Scenario: Editor renders without overflow

- GIVEN a viewport of 375px
- WHEN `/admin/promotions` loads
- THEN the page has no horizontal overflow at the document level

#### Scenario: Edit modal fits mobile

- GIVEN a viewport of 375px
- WHEN the tile edit modal is opened
- THEN the modal fits within the viewport and all fields are reachable without page-level overflow
