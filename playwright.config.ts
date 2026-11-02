import { defineConfig, devices } from '@playwright/test'

// The stack is started separately: `./deploy/dev up -d --fresh` from the parent repo (:5183).
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5183',
    // 1440 is "wide" (>= 1280): the item opens in the side panel next to the list.
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
})
