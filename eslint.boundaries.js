// F020 import boundaries, enforced with the built-in no-restricted-imports (decision F020-Q3).
// Imported by eslint.config.js. Rules (no exemption list: they apply to every file):
//   A. components and lib never import features, layouts, routes, app or mocks; data (src/data:
//      query keys and invalidation, F020-W4) never imports features, layouts, routes, app, mocks or components.
//   B. a feature imports another feature only through its index.ts (or its testing.ts test kit).
//   C. files outside features import a feature only through its index.ts (or its testing.ts test kit).
// Public entries per feature: index.ts, testing.ts (test kit) and screens.ts (heavy route-level
// components, imported only by src/routes; screens.ts keeps barrels light for code splitting).
// One exception: a feature may import stores/screens (StoreChoices, used by items/inline/StreamingInputs.tsx
// inside the lazy item editor), so the ServiceIcon logos stay out of the eager bundle.
// Flat config replaces a rule's options per file, so the blocks below are split so that each
// file matches exactly one block that sets the rule.
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const FEATURES = readdirSync(join(import.meta.dirname, 'src/features'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

const THROUGH_INDEX = 'Import features through their index.ts (F020 boundaries)'

const featureBlocks = FEATURES.map((feature) => ({
  files: [`src/features/${feature}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            // a feature's testing module (its test kit) is the deep import allowed; screens modules are for
            // src/routes only (F020-W3), except stores/screens (the store picker, see the header)
            group: [
              ...FEATURES.filter((other) => other !== feature).map((other) => `**/${other}/*`),
              ...FEATURES.map((other) => `!**/${other}/testing`),
              '!**/stores/screens',
            ],
            message: THROUGH_INDEX,
          },
        ],
      },
    ],
  },
}))

const APP_LAYERS = ['**/features/**', '**/layouts/**', '**/routes/**', '**/app/**', '**/mocks/**']

export default [
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: APP_LAYERS,
              message:
                'components and lib never import features, layouts, routes, app or mocks (F020 boundaries)',
            },
          ],
        },
      ],
    },
  },
  {
    // One block per file: data is not in the block C files below, so this is its only restriction.
    files: ['src/data/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [...APP_LAYERS, '**/components/**'],
              message:
                'data never imports features, layouts, routes, app, mocks or components (F020-W4 boundaries)',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/features/**', 'src/components/**', 'src/lib/**', 'src/data/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/features/*/*', '!**/features/*/testing', '!**/features/*/screens'],
              message: THROUGH_INDEX,
            },
          ],
        },
      ],
    },
  },
  ...featureBlocks,
]
