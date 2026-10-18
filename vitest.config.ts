import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    globals: true,
    // Shared fake browser environment (test/browser-env.ts), installed by
    // test/setup.ts: no test file has to re-declare localStorage/window/document.
    setupFiles: ['test/setup.ts'],
  },
});
