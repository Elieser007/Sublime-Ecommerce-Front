import { describe, it, expect, beforeEach, vi } from "vitest";
import { addToWishlist, getWishlist, getWishlistCount } from "../lib/wishlist";
import {
  localStorageMock,
  dispatchEventMock,
  resetBrowserEnv,
} from "../../test/browser-env";

/**
 * Contract test for the shared unit-test browser environment.
 *
 * Unit tests run in vitest's default Node environment: there is no `window`,
 * `document` or `localStorage` (verified on Node 26). This file deliberately
 * installs NOTHING — it asserts that every test file already gets the shared
 * environment from `vitest.config.ts` → `setupFiles` → `test/browser-env.ts`.
 * That is what lets per-file mock blocks disappear without losing coverage.
 */
describe("shared browser environment (setupFiles)", () => {
  beforeEach(() => {
    resetBrowserEnv();
  });

  it("installs localStorage, window and document on globalThis", () => {
    expect(globalThis.localStorage).toBe(localStorageMock);
    expect(globalThis.window.dispatchEvent).toBe(dispatchEventMock);
    expect(typeof globalThis.document.getElementById).toBe("function");
  });

  it("serves a LocalStorage-backed module end to end", () => {
    const product = { id: "1", slug: "remera", name: "Remera", price: 100, image: "i.webp" };

    addToWishlist(product);

    expect(getWishlistCount()).toBe(1);
    expect(getWishlist()).toHaveLength(1);
    // The shared handle observes the same store the module wrote through
    expect(JSON.parse(localStorageMock.getItem("wishlist") || "[]")).toHaveLength(1);
    // ... and the module's broadcast went to the shared window mock
    expect(dispatchEventMock).toHaveBeenCalled();
  });

  it("keeps the environment replaceable with vi.stubGlobal", () => {
    // modalStack.test.ts stubs window/document per case. The installed
    // properties must stay configurable or that redefinition throws
    // (Object.defineProperty rejects a non-configurable target).
    const replacement = { addEventListener: vi.fn() };

    vi.stubGlobal("window", replacement);
    expect(globalThis.window).toBe(replacement);

    vi.unstubAllGlobals();
    expect(globalThis.window.dispatchEvent).toBe(dispatchEventMock);
  });
});
