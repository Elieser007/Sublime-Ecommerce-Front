# Delta for Product Gallery

## ADDED Requirements

### Requirement: REQ-10 — Scrollable Thumb Strip

Thumb strip SHALL render below the main image (never fullscreen), scroll horizontally when overflowing, and render only for ≥2 images.

#### Scenario: Overflowing strip scrolls

- GIVEN 6 images on a narrow viewport
- WHEN the page renders
- THEN the strip scrolls horizontally
- AND all thumbnails stay reachable

#### Scenario: Strip hidden for one image

- GIVEN exactly 1 image
- WHEN the page renders
- THEN the thumb strip is not rendered

### Requirement: REQ-11 — Lightbox Open and Close

Lightbox SHALL open via expand button or main-image click (not nav controls) and SHALL close via ✕, Escape, or backdrop (not controls).

#### Scenario: Open via expand button

- GIVEN ≥2 images
- WHEN the expand button is clicked
- THEN the lightbox opens fullscreen

#### Scenario: Open via main image click

- GIVEN the lightbox closed
- WHEN the main image is clicked off controls
- THEN the lightbox opens

#### Scenario: Close via ✕, Escape, or backdrop

- GIVEN the lightbox open
- WHEN ✕, Escape, or the backdrop (not a control) is used
- THEN the lightbox closes

### Requirement: REQ-12 — Stage Fill, Counter, Strip Sync

Stage image SHALL fill the stage (object-fit contain, no letterbox), show an "N / M" counter, and show a strip synced to the main strip.

#### Scenario: Image fills the stage

- GIVEN the lightbox open
- WHEN the stage renders
- THEN the image fills the stage with no letterbox space

#### Scenario: Counter and synced strip

- GIVEN image 2 of 4 in the lightbox
- THEN counter reads "2 / 4"
- AND lightbox strip matches main strip highlight

### Requirement: REQ-13 — Zoom Math

Scale SHALL clamp to [1, 6]. Plain wheel deltaY > 0 and trackpad pinch (ctrlKey, deltaY < 0) SHALL zoom in; wheel zoom SHALL anchor at the cursor; +/− SHALL step 1.25× centered; double-click SHALL toggle fit ↔ 2.5× at the pointer.

#### Scenario: Plain wheel zooms in

- GIVEN scale 1
- WHEN the wheel scrolls down (deltaY > 0)
- THEN scale increases at the cursor
- AND never exceeds 6

#### Scenario: Pinch zooms in

- GIVEN scale 1
- WHEN pinching out (ctrlKey, deltaY < 0)
- THEN scale increases

#### Scenario: Buttons and double-click

- GIVEN scale 1
- WHEN + or a double-click is used
- THEN scale becomes 1.25× or 2.5× (at pointer)
- AND double-click at scale > 1 resets to fit

### Requirement: REQ-14 — Pan Clamping

Drag (mouse/touch) SHALL pan at scale > 1, clamped so edges never leave the stage; pan SHALL be disabled at scale 1 except during pinch.

#### Scenario: Drag pans clamped

- GIVEN scale 3
- WHEN dragged to the edge
- THEN translation clamps to ±(stage·(scale−1))/2

#### Scenario: No pan at scale 1

- GIVEN scale 1
- WHEN dragged
- THEN the image does not move

### Requirement: REQ-15 — Navigation and Keyboard

Prev/next SHALL wrap (arrows and ←/→). With lightbox open: Escape SHALL close, ←/→ SHALL navigate, +/= SHALL zoom in, − SHALL zoom out, 0 SHALL reset.

#### Scenario: Arrows wrap around

- GIVEN the last image shown
- WHEN next (arrow or →) is used
- THEN the first image shows

#### Scenario: Keyboard active only when open

- GIVEN the lightbox open
- WHEN →, +, −, or 0 is pressed
- THEN navigation/zoom applies
- AND arrows do not navigate when closed

### Requirement: REQ-16 — Sync and Reset

Lightbox and main gallery SHALL share one current index; navigation in either SHALL update the other; scale SHALL reset to 1 on image change and lightbox open.

#### Scenario: Lightbox updates main

- GIVEN image 1 in both views
- WHEN → is pressed in the lightbox
- THEN main image, counters, and strips show image 2

#### Scenario: Main updates lightbox

- GIVEN the lightbox open on image 1
- WHEN main thumbnail 3 is clicked
- THEN the lightbox stage shows image 3

#### Scenario: Zoom resets on change and open

- GIVEN scale 4 on image 1
- WHEN navigating to image 2 or reopening the lightbox
- THEN scale resets to 1

### Requirement: REQ-17 — Lightbox Accessibility

Lightbox SHALL use role="dialog" + aria-modal="true", move focus to close on open and back to expand on close, lock body scroll while open, and expose aria-labels on all controls.

#### Scenario: Focus moves on open and close

- GIVEN the lightbox opens
- THEN focus lands on the close button
- AND returns to the expand button on close

#### Scenario: Body scroll locked while open

- GIVEN the lightbox open
- THEN the body does not scroll
- AND scrolling resumes after close

#### Scenario: Controls labeled

- GIVEN the lightbox rendered
- THEN expand, close, prev/next, zoom, and thumb buttons have aria-labels
