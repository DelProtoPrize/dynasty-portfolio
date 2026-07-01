import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'src/tests/e2e',
  webServer: {
    command: 'npm run dev -- --port 4173',
    port: 4173,
    reuseExistingServer: true,
    timeout: 30000
  },
  use: { baseURL: 'http://localhost:4173' }
});
