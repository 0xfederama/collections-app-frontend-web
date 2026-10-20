import { useCallback, useSyncExternalStore } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

// Keep in sync with the inline bootstrap script in index.html (it runs before first paint).
export const THEME_STORAGE_KEY = 'collection:theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'
const listeners = new Set<() => void>()

const isPreference = (value: unknown): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark'

export function getThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isPreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

const systemPrefersDark = () =>
  typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches

function resolveTheme(pref: ThemePreference = getThemePreference()): ResolvedTheme {
  if (pref === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return pref
}

function applyTheme(pref: ThemePreference = getThemePreference()): ResolvedTheme {
  const resolved = resolveTheme(pref)
  document.documentElement.dataset.theme = resolved
  return resolved
}

export function setThemePreference(pref: ThemePreference): void {
  try {
    if (pref === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, pref)
  } catch {
    // Storage can be blocked; the theme still applies for this page load.
  }
  applyTheme(pref)
  listeners.forEach((listener) => listener())
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  const query = typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null
  const onSystemChange = () => {
    if (getThemePreference() === 'system') applyTheme('system')
    onChange()
  }
  query?.addEventListener('change', onSystemChange)
  window.addEventListener('storage', onChange)
  return () => {
    listeners.delete(onChange)
    query?.removeEventListener('change', onSystemChange)
    window.removeEventListener('storage', onChange)
  }
}

/** Current preference and resolved theme; follows system changes while the preference is `system`. */
export function useThemePreference() {
  const preference = useSyncExternalStore(subscribe, getThemePreference, () => 'system' as const)
  const resolved = useSyncExternalStore(
    subscribe,
    () => resolveTheme(),
    () => 'light' as const,
  )
  const setPreference = useCallback((pref: ThemePreference) => setThemePreference(pref), [])
  return { preference, resolved, setPreference }
}
