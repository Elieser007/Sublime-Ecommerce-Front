/**
 * API URL — single source of truth for the backend base URL.
 *
 * Every API call (auth, products, promotions, users, image upload) must
 * resolve its backend URL through getApiUrl(). Never duplicate the
 * `import.meta.env.PUBLIC_API_URL || 'http://localhost:8787'` fallback:
 * that is the exact pattern that stored localhost image URLs in production.
 *
 * Policy:
 * - Dev (astro dev): falls back to http://localhost:8787.
 * - Production build: PUBLIC_API_URL is REQUIRED. getApiUrl() throws a clear
 *   error if it is missing, and astro.config.mjs fails the build up front.
 */

const DEV_FALLBACK = "http://localhost:8787";

type EnvShape = {
  PUBLIC_API_URL?: string;
  PROD?: boolean;
};

function currentEnv(): EnvShape {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env as EnvShape;
  }
  return {};
}

export function getApiUrl(): string {
  const env = currentEnv();
  const configured = env.PUBLIC_API_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  if (env.PROD) {
    throw new Error(
      "PUBLIC_API_URL is not configured. Set it in Cloudflare Pages (Settings → Environment variables) or in .env.production before building."
    );
  }

  return DEV_FALLBACK;
}
