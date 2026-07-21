// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// SSG output: Cloudflare Pages serves static HTML with zero Workers invocations.
// The public catalog is compiled at build time; Hono is NOT involved in public navigation.
export default defineConfig({
  output: 'static',
  adapter: cloudflare(),
});
