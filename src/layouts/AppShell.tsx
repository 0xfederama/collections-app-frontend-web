import { Link, Outlet } from 'react-router'
import { useBackendStatus } from '../lib/backendStatus'

export function AppShell() {
  const status = useBackendStatus()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-stone-300 px-4 py-3">
        <Link to="/" className="font-semibold">
          Collection
        </Link>
        <span aria-live="polite" className="text-sm text-stone-600">
          Backend: {status}
        </span>
      </header>
      <div className="flex flex-1">
        <nav aria-label="Collections" className="w-64 border-r border-stone-300 p-4 text-sm">
          Sidebar placeholder
        </nav>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
