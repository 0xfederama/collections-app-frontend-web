// Usage: npm run api:sync -- api-v0.N.0 [--from <path-to-backend-checkout>]
// Vendors api/openapi.yaml at a backend tag, records the lock file and regenerates src/generated/.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generate, sha256 } from './lib/generate.mjs'

const BACKEND_REPO = 'https://github.com/0xfederama/collections-app-backend.git'
const root = fileURLToPath(new URL('..', import.meta.url))

function fail(message) {
  console.error(`api:sync: ${message}`)
  process.exit(1)
}

const git = (args, options = {}) =>
  execFileSync('git', args, { stdio: ['ignore', 'pipe', 'pipe'], ...options })

const args = process.argv.slice(2)
const fromIndex = args.indexOf('--from')
const from = fromIndex === -1 ? undefined : args.splice(fromIndex, 2)[1]
const [tag, ...extra] = args
if (!tag || extra.length || (fromIndex !== -1 && !from)) {
  fail('usage: npm run api:sync -- api-v0.N.0 [--from <path-to-backend-checkout>]')
}
// Pinning to a tag, never a branch or a bare commit, is the contract protocol (AGENT_WORKFLOW §6).
if (!/^api-v\d+\.\d+\.\d+$/.test(tag)) fail(`"${tag}" is not a contract tag (expected api-vN.N.N)`)

let spec
let commit
try {
  if (from) {
    git(['-C', from, 'rev-parse', '--verify', '--quiet', `refs/tags/${tag}`])
    commit = git(['-C', from, 'rev-parse', `${tag}^{commit}`], { encoding: 'utf8' }).trim()
    spec = git(['-C', from, 'show', `${tag}:api/openapi.yaml`], { maxBuffer: 64 * 1024 * 1024 })
  } else {
    const remote = git(['ls-remote', '--tags', BACKEND_REPO, `refs/tags/${tag}`], {
      encoding: 'utf8',
    })
    if (!remote.trim()) fail(`tag ${tag} does not exist in ${BACKEND_REPO}`)
    const dir = mkdtempSync(join(tmpdir(), 'api-sync-'))
    try {
      git(['clone', '--quiet', '--depth', '1', '--branch', tag, BACKEND_REPO, dir])
      commit = git(['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
      spec = readFileSync(join(dir, 'api', 'openapi.yaml'))
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }
} catch (error) {
  fail(
    `could not read api/openapi.yaml at ${tag}: ${error.stderr?.toString().trim() || error.message}`,
  )
}

const generated = await generate(spec)

mkdirSync(join(root, 'api'), { recursive: true })
mkdirSync(join(root, 'src/generated'), { recursive: true })
writeFileSync(join(root, 'api/openapi.yaml'), spec)
writeFileSync(
  join(root, 'api/openapi.lock.json'),
  `${JSON.stringify({ tag, commit, sha256: sha256(spec) }, null, 2)}\n`,
)
for (const [name, content] of Object.entries(generated)) {
  writeFileSync(join(root, 'src/generated', name), content)
}
console.log(
  `api:sync: ${tag} (${commit.slice(0, 7)}) vendored, ${Object.keys(generated).length} files generated`,
)
