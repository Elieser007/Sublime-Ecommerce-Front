// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

// Astro 7 loads astro.config as a static object (defineConfig does not accept
// a function). Module-level code below runs once when the config is loaded.
// The Astro CLI sets NODE_ENV to 'production' for `astro build` (before the
// config loads) and 'development' for `astro dev`.
const isBuild = process.env.NODE_ENV === 'production';
const env = { ...loadEnv(isBuild ? 'production' : 'development', process.cwd(), ''), ...process.env };

// Production builds REQUIRE PUBLIC_API_URL. Failing fast with a clear
// message beats shipping an admin panel that silently targets localhost
// (the root cause of the production gallery image URL bug).
if (isBuild) {
  if (!env.PUBLIC_API_URL) {
    throw new Error(
      '[build] PUBLIC_API_URL is required for production builds. Set it in Cloudflare Pages → Settings → Environment variables (or .env.production for local previews).'
    );
  }
  if (/localhost|127\.0\.0\.1/.test(env.PUBLIC_API_URL)) {
    console.warn('[build] WARNING: PUBLIC_API_URL points to localhost — production builds will hit a local API.');
  }
}

export default defineConfig({
  output: 'static',
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    css: {
      transformer: 'lightningcss',
      lightningcss: {
        minify: false,
        errorRecovery: true,
      },
    },
  },
});
