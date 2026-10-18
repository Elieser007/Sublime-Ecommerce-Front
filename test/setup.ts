/**
 * setup.ts — vitest `setupFiles` entry (wired in vitest.config.ts).
 *
 * Installs the shared browser fakes from test/browser-env.ts for every test
 * file, so individual files no longer re-declare localStorage/window/document.
 *
 * The install runs in a root `beforeAll`, NOT at import time, on purpose:
 * `src/lib/modalStackHandler.js` auto-inits at import when a `window` exists,
 * which flips its module-level `_initialized` flag and breaks its ESC
 * integration test. Hooks run after the test file's imports, so import-time
 * behaviour stays exactly as it was when no browser global existed.
 */
import { beforeAll } from "vitest";
import { installBrowserEnv } from "./browser-env";

beforeAll(() => {
  installBrowserEnv();
});
