// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'static',
  adapter: cloudflare(),
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
