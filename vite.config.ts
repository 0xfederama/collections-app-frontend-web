import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { rmSync } from 'node:fs'
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

// Dev is same-origin like prod (D-033): the app calls relative /api and Vite proxies it to the backend.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.API_PROXY_TARGET || 'http://localhost:8080'
  const proxy = { target, changeOrigin: false }

  return {
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
