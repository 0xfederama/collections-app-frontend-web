// Builds the production web image (Q-03w, D-069). Last step of `npm run check`.
// Usage: node scripts/docker-build.mjs [image-tag]   (default: collections-web:check)
import { spawnSync } from 'node:child_process'

const tag = process.argv[2] ?? 'collections-web:check'

const info = spawnSync('docker', ['info'], { stdio: 'ignore' })
if (info.error || info.status !== 0) {
  console.error(
    '\ndocker:build failed: Docker is not available (is Docker Desktop / the daemon running?).\n' +
      'npm run check builds the production image (Dockerfile) as its last step, so it needs Docker. Start Docker and rerun.\n',
  )
  process.exit(1)
}

const build = spawnSync('docker', ['build', '-t', tag, '.'], { stdio: 'inherit' })
if (build.status !== 0) process.exit(build.status ?? 1)

// D-150: the built image must proxy the LAN host and pass the Cloudflare headers through unchanged.
const check = spawnSync('node', ['scripts/proxy-headers-check.mjs', tag], { stdio: 'inherit' })
process.exit(check.status ?? 1)
