import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit(), svelteTesting()],
  server: { fs: { allow: ['../etl/data'] } },
  ssr: { external: ['better-sqlite3', 'pg'] },
  build: {
    rollupOptions: {
      external: ['pg']
    }
  },
  test: {
    include: ['src/tests/unit/**/*.test.ts'],
    environment: 'jsdom'
  }
});
