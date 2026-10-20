// Dist check (part of `npm run check`, right after `vite build`). Fails when development-only code
// reached the production bundle: the MSW worker, the /dev/ui gallery, the tree fake. Then prints the
// asset sizes. There is no size budget (D-034): the table is information only.
// Usage: node scripts/dist-check.mjs [dir]   (dir defaults to dist/)
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const root = fileURLToPath(new URL('..', import.meta.url))
const FORBIDDEN_NAME = /mockServiceWorker|msw|DevUi/i
const FORBIDDEN_TEXT = ['setupWorker', 'createTreeBackend', 'DevUiRoute', '/dev/ui']

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

function findProblems(dir) {
  const problems = []
  for (const file of walk(dir)) {
    const name = relative(dir, file)
    if (FORBIDDEN_NAME.test(basename(file))) {
      problems.push(`${name}: the file name is dev-only code`)
    }
    if (file.endsWith('.js')) {
      const text = readFileSync(file, 'utf8')
      for (const needle of FORBIDDEN_TEXT) {
        if (text.includes(needle)) problems.push(`${name}: contains "${needle}"`)
      }
    }
  }
  return problems
}

const kb = (bytes) => (bytes / 1024).toFixed(2)

function printSizes(dir) {
  const assets = join(dir, 'assets')
  if (!existsSync(assets)) return
  const rows = readdirSync(assets)
    .map((name) => {
      const bytes = readFileSync(join(assets, name))
      return { name, raw: bytes.length, gzip: gzipSync(bytes).length }
    })
    .sort((a, b) => b.raw - a.raw)
  const total = rows.reduce((sum, row) => ({ raw: sum.raw + row.raw, gzip: sum.gzip + row.gzip }), {
    raw: 0,
    gzip: 0,
  })
  const width = Math.max(5, ...rows.map((row) => row.name.length))
  console.log(`${'file'.padEnd(width)}  ${'raw KB'.padStart(10)}  ${'gzip KB'.padStart(10)}`)
  for (const row of rows) {
    console.log(
      `${row.name.padEnd(width)}  ${kb(row.raw).padStart(10)}  ${kb(row.gzip).padStart(10)}`,
    )
  }
  console.log(
    `${'total'.padEnd(width)}  ${kb(total.raw).padStart(10)}  ${kb(total.gzip).padStart(10)}`,
  )
}

const dir = resolve(process.argv[2] ?? join(root, 'dist'))
if (!existsSync(dir)) {
  console.error(`dist-check: ${dir} does not exist. Run \`vite build\` first.`)
  process.exit(2)
}

printSizes(dir)
const problems = findProblems(dir)
if (problems.length > 0) {
  console.error('\ndist-check failed: development code reached the production build:')
  for (const problem of problems) console.error(`  - ${problem}`)
  console.error(
    'Keep dev-only code behind import.meta.env.DEV or VITE_API_MOCKS (see docs/architecture.md).',
  )
  process.exit(1)
}
console.log('\ndist-check: no development code in the production build')
