// Offline gate (part of `npm run check`): the vendored spec must match its lock file, and
// src/generated/ must be exactly what api:sync would produce from it.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generate, sha256 } from './lib/generate.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const problems = []

const read = (path) => (existsSync(join(root, path)) ? readFileSync(join(root, path)) : undefined)

const spec = read('api/openapi.yaml')
const lock = read('api/openapi.lock.json')
if (!spec || !lock) {
  problems.push('api/openapi.yaml or api/openapi.lock.json is missing')
} else {
  const locked = JSON.parse(lock.toString('utf8'))
  if (sha256(spec) !== locked.sha256) {
    problems.push(`api/openapi.yaml does not match the lock (${locked.tag}): it was edited by hand`)
  }
  const expected = await generate(spec)
  const dir = join(root, 'src/generated')
  const present = existsSync(dir) ? readdirSync(dir).sort() : []
  const names = Object.keys(expected).sort()
  for (const name of present.filter((n) => !names.includes(n))) {
    problems.push(`src/generated/${name} is not produced by api:sync`)
  }
  for (const name of names) {
    const actual = read(`src/generated/${name}`)
    if (!actual) problems.push(`src/generated/${name} is missing`)
    else if (actual.toString('utf8') !== expected[name])
      problems.push(`src/generated/${name} is stale or was edited`)
  }
}

if (problems.length) {
  console.error(`api:check failed:\n${problems.map((p) => `  - ${p}`).join('\n')}`)
  console.error(
    'Fix: run `npm run api:sync -- <tag>` (see api/openapi.lock.json for the pinned tag).',
  )
  process.exit(1)
}
console.log('api:check: api/openapi.yaml matches the lock and src/generated/ is up to date')
