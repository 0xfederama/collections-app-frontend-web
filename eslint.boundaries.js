// F020 import boundaries, enforced with the built-in no-restricted-imports (decision F020-Q3).
// Imported by eslint.config.js. Rules (no exemption list: they apply to every file):
//   A. components and lib never import features, layouts, routes, app or mocks.
//   B. a feature imports another feature only through its index.ts (or its testing.ts test kit).
//   C. files outside features import a feature only through its index.ts (or its testing.ts test kit).
// Public entries per feature: index.ts, testing.ts (test kit) and screens.ts (heavy route-level
// components, imported only by src/routes; screens.ts keeps barrels light for code splitting).
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
            // a feature's testing module (its test kit) and screens module are the deep imports allowed
            // (F020-W3, screens for src/routes)
            group: [
              ...FEATURES.filter((other) => other !== feature).map((other) => `**/${other}/*`),
              ...FEATURES.map((other) => `!**/${other}/testing`),
              ...FEATURES.map((other) => `!**/${other}/screens`),
            ],
            message: THROUGH_INDEX,
          },
        ],
      },
    ],
  },
}))

export default [
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/features/**',
                '**/layouts/**',
                '**/routes/**',
                '**/app/**',
                '**/mocks/**',
              ],
              message:
                'components and lib never import features, layouts, routes, app or mocks (F020 boundaries)',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/features/**', 'src/components/**', 'src/lib/**'],
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
