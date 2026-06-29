import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: { fs: { allow: ['../etl/data'] } },
  ssr: { external: ['better-sqlite3'] },
  test: {
    include: ['src/tests/unit/**/*.test.ts'],
    environment: 'jsdom'
  }
});
