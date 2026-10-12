/**
 * ClientRouter script-wiring guard
 *
 * `<ClientRouter />` executes each bundled component script at most once per
 * document session (Astro dedupes by script `src`), so DOM wiring at module
 * scope runs on the first page of the session and never again (the gallery
 * went dead on the second SPA-visited product page). Both components below
 * must register their wiring through `astro:page-load`, which fires after the
 * DOM swap on every navigation and on the initial load.
 *
 * Source-structure tests (variant-price-sync.test.ts pattern): this is a
 * guard, not behavioural proof — e2e/spa-wiring-revisit.spec.ts carries the
 * behaviour.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const gallerySource = readFileSync(
  resolve(__dirname, "../components/ProductGallery.astro"),
  "utf-8"
);
const carouselSource = readFileSync(
  resolve(__dirname, "../components/promo/CarouselPromo.astro"),
  "utf-8"
);

// Pinned exact string: a future edit must not silently move wiring back to
// module scope without also tripping this guard.
const PAGE_LOAD_LISTENER = "document.addEventListener('astro:page-load'";

describe("ClientRouter script wiring", () => {
  it("ProductGallery re-arms its wiring on every astro:page-load", () => {
    expect(gallerySource).toContain(PAGE_LOAD_LISTENER);
    expect(gallerySource).toContain("__galleryInit");
  });

  it("CarouselPromo re-arms its wiring on every astro:page-load", () => {
    expect(carouselSource).toContain(PAGE_LOAD_LISTENER);
    expect(carouselSource).toContain("__carouselPromoInit");
  });
});
