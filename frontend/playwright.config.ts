import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  retries: 1,
  workers: 1,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npm run dev',
      port: 8443,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    }
  ]
});
