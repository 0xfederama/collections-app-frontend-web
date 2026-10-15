// Prints the CSP source expression ('sha256-…') of the one inline <script> in a built index.html.
//
// Usage: node scripts/csp-hash.mjs dist/index.html
//
// The Dockerfile substitutes the output into the Caddyfile, so the hash is computed from the exact
// bytes Vite emitted and cannot drift from the no-flash theme script in index.html.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) {
  console.error('usage: node scripts/csp-hash.mjs <built index.html>')
  process.exit(2)
}

const html = readFileSync(file, 'utf8')

// Inline scripts are <script> tags without a src attribute. Their text is hashed byte for byte
// (whitespace included), which is what browsers do.
const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)]

if (inline.length !== 1) {
  console.error(
    `csp-hash: expected exactly 1 inline <script> in ${file}, found ${inline.length}. ` +
      'Every inline script needs its own hash in the Caddyfile: update this script and the CSP together.',
  )
  process.exit(1)
}

const digest = createHash('sha256').update(inline[0][1], 'utf8').digest('base64')
process.stdout.write(`'sha256-${digest}'\n`)
