import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// public/mockServiceWorker.js is only for `VITE_API_MOCKS=1 npm run dev`; keep it out of production builds.
const dropMockWorker = (): Plugin => ({
  name: 'drop-mock-service-worker',
  apply: 'build',
  closeBundle() {
    rmSync(join(process.cwd(), 'dist/mockServiceWorker.js'), { force: true })
  },
})

// Build-time constants for Settings > Connection: the API contract tag the client was generated from, and the app version.
const readJson = (file: string) =>
  JSON.parse(readFileSync(join(process.cwd(), file), 'utf8')) as Record<string, string>

// Dev is same-origin like prod (D-033): the app calls relative /api and Vite proxies it to the backend.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.API_PROXY_TARGET || 'http://localhost:8080'
  const proxy = { target, changeOrigin: false }

  return {
    define: {
      __API_CONTRACT_TAG__: JSON.stringify(readJson('api/openapi.lock.json').tag),
      __APP_VERSION__: JSON.stringify(readJson('package.json').version),
    },
    plugins: [react(), tailwindcss(), dropMockWorker()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: { '/api': proxy, '/readyz': proxy },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test-setup.ts'],
      css: false,
      // Headroom for a cold first test in a file when every worker is busy (default 5 s).
      testTimeout: 15_000,
    },
  }
})
