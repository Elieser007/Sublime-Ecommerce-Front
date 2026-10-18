/**
 * browser-env.ts — Shared fake browser environment for unit tests.
 *
 * Tests run in Node (no jsdom): `window`, `document` and `localStorage` do not
 * exist. This module owns the single set of fakes so no test file re-declares
 * them; `test/setup.ts` installs it for every file via `setupFiles`.
 *
 * `fetch` and `history` are deliberately NOT faked: their shape differs per
 * test file and stays local to the file that needs it.
 */
import { vi } from "vitest";

/** Element shape the fake `document.getElementById` can return. */
export interface FakeElement {
  textContent: string;
  style: Record<string, string>;
}

interface RegisteredElement {
  element: FakeElement;
  initialText: string;
  initialStyle: Record<string, string>;
}

function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
}

/** The one fake LocalStorage shared within a test file. */
export const localStorageMock = createLocalStorageMock();
/** `window.dispatchEvent` spy — proves modules broadcast storage changes. */
export const dispatchEventMock = vi.fn();

/** Minimal fake `window`: only what the LocalStorage-backed modules touch. */
export const windowMock = {
  dispatchEvent: dispatchEventMock,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const elements = new Map<string, RegisteredElement>();

/**
 * Make `document.getElementById(id)` return `element`, and let
 * `resetBrowserEnv()` restore its initial text/style between tests.
 */
export function registerElement(id: string, element: FakeElement): void {
  elements.set(id, {
    element,
    initialText: element.textContent,
    initialStyle: { ...element.style },
  });
}

/** Minimal fake `document` for units that read or annotate DOM nodes. */
export const documentMock = {
  getElementById: vi.fn((id: string) => elements.get(id)?.element ?? null),
  querySelector: vi.fn(() => null),
  querySelectorAll: vi.fn(() => []),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: "complete",
};

/**
 * Install the fakes on `globalThis`.
 *
 * `configurable: true` is mandatory: tests override these with `vi.stubGlobal`
 * (lib/modalStack.test.ts re-stubs window/document per case) and redefining a
 * non-configurable property throws a TypeError.
 *
 * Call it from a hook, never at import time. `src/lib/modalStackHandler.js`
 * auto-inits at import when `typeof window !== "undefined"` is true, which
 * flips its module-level `_initialized` flag; its later `init()` calls would
 * then skip the keydown registration and its ESC integration test would fail.
 */
export function installBrowserEnv(): void {
  defineGlobal("localStorage", localStorageMock);
  defineGlobal("window", windowMock);
  defineGlobal("document", documentMock);
}

function defineGlobal(name: string, value: unknown): void {
  Object.defineProperty(globalThis, name, {
    value,
    writable: true,
    configurable: true,
  });
}

/** Reset storage, registered elements and spy history between tests. */
export function resetBrowserEnv(): void {
  localStorageMock.clear();
  for (const { element, initialText, initialStyle } of elements.values()) {
    element.textContent = initialText;
    for (const key of Object.keys(element.style)) delete element.style[key];
    Object.assign(element.style, initialStyle);
  }
  vi.clearAllMocks();
}
