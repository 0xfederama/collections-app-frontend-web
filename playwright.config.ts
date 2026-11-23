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
      testIgnore: [
        '**/16-mobile.spec.ts',
        '**/18-mobile-home.spec.ts',
        '**/24-mobile-adds-sort.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    // Web 3.3.0: the sidebar drag layer on desktop WebKit (Safari's engine), where pointer and focus
    // behave differently. Only the drag specs run there. Once: `npx playwright install webkit`.
    {
      name: 'webkit',
      testMatch: ['**/25-tree-drag-moves.spec.ts', '**/tree-dnd.spec.ts'],
      use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } },
    },
    // F-025: phone layout, run in WebKit (the engine of iOS Safari). Once: `npx playwright install webkit`.
    {
      name: 'mobile-webkit',
      testMatch: [
        '**/16-mobile.spec.ts',
        '**/18-mobile-home.spec.ts',
        '**/24-mobile-adds-sort.spec.ts',
        '**/26-movie-extras.spec.ts',
        '**/27-all-items.spec.ts',
        '**/28-share-list.spec.ts',
      ],
      use: { ...devices['iPhone 15'] },
    },
  ],
})
