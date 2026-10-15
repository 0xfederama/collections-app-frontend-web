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
process.exit(build.status ?? 1)
