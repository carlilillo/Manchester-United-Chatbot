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
    // Shiki is loaded via dynamic imports the dep scanner can't see at startup;
    // pre-bundle it so Vite doesn't re-optimize (and invalidate chunks) mid-session.
    optimizeDeps: {
      include: [
        'shiki/core',
        'shiki/engine/javascript',
        'shiki/langs/css.mjs',
        'shiki/langs/diff.mjs',
        'shiki/langs/html.mjs',
        'shiki/langs/javascript.mjs',
        'shiki/langs/json.mjs',
        'shiki/langs/jsx.mjs',
        'shiki/langs/markdown.mjs',
        'shiki/langs/python.mjs',
        'shiki/langs/shellscript.mjs',
        'shiki/langs/sql.mjs',
        'shiki/langs/tsx.mjs',
        'shiki/langs/typescript.mjs',
        'shiki/langs/yaml.mjs',
        'shiki/themes/github-dark.mjs',
        'shiki/themes/github-light.mjs',
      ],
    },
    test: {
      environment: 'jsdom',
    },
  };
});
