import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/fraunces/full.css'
import { App } from './app/App'
import './styles/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('missing #root element')

// `VITE_API_MOCKS=1 npm run dev` serves the API from the spec examples. Vite replaces the flag at
// build time, so this branch and the whole mocks module are absent from production bundles.
async function enableMocks() {
  if (import.meta.env.VITE_API_MOCKS !== '1') return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true })
}

// A failed mock start (e.g. a browser without service workers) must not leave a blank page.
void enableMocks()
  .catch((error: unknown) => console.error('API mocks failed to start', error))
  .then(() =>
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
