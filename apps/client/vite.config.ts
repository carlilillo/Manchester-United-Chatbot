import path from 'node:path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { parseSiteUrl, siteMetadata } from './build/site-metadata';

export default defineConfig(({ mode }) => {
  // SITE_URL is build configuration, not a browser-exposed application setting.
  const env = loadEnv(mode, __dirname, 'SITE_URL');

  return {
    plugins: [react(), tailwindcss(), siteMetadata(parseSiteUrl(env.SITE_URL))],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
      proxy: { '/api': 'http://localhost:3000' },
    },
    test: {
      environment: 'jsdom',
    },
  };
});
