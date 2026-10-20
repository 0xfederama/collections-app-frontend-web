// F020 import boundaries, enforced with the built-in no-restricted-imports (decision F020-Q3).
// Imported by eslint.config.js. Rules:
//   A. components and lib never import features, layouts, routes, app or mocks.
//   B. a feature imports another feature only through its index.ts.
//   C. files outside features import a feature only through its index.ts.
// Flat config replaces a rule's options per file, so the blocks below are split so that each
// file matches exactly one block that sets the rule.
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import baseline from './eslint.boundaries.baseline.js'

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
            group: FEATURES.filter((other) => other !== feature).map((other) => `**/${other}/*`),
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
          patterns: [{ group: ['**/features/*/*'], message: THROUGH_INDEX }],
        },
      ],
    },
  },
  ...featureBlocks,
  // legacy, shrinks as F020-W3 splits each area; never add a file here
  ...(baseline.length > 0 ? [{ files: baseline, rules: { 'no-restricted-imports': 'off' } }] : []),
]
