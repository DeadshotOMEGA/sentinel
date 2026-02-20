import { defineConfig } from '@playwright/test'
import path from 'node:path'

const authStatePath = path.resolve(__dirname, 'tests/e2e/.auth/member.json')

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  outputDir: 'test-results/e2e/playwright',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'test-results/e2e/playwright-report' }]],
  use: {
    baseURL: 'http://localhost:3001',
    storageState: authStatePath,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
})
