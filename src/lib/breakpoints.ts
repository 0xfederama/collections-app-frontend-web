import { useSyncExternalStore } from 'react'

/**
 * UI_SPEC §2 breakpoints, the single source of truth for JS. They equal Tailwind's default
 * `md` / `lg` / `xl`, so CSS classes (`md:`, `lg:`, `xl:`) agree with this hook.
 */
export const BREAKPOINTS = { tablet: 768, desktop: 1024, wide: 1280 } as const

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide'

export function classifyWidth(width: number): Breakpoint {
  if (width >= BREAKPOINTS.wide) return 'wide'
  if (width >= BREAKPOINTS.desktop) return 'desktop'
  if (width >= BREAKPOINTS.tablet) return 'tablet'
  return 'mobile'
}

const queries = [BREAKPOINTS.tablet, BREAKPOINTS.desktop, BREAKPOINTS.wide].map(
  (px) => `(min-width: ${px}px)`,
)

const hasMatchMedia = () => typeof window.matchMedia === 'function'

function getSnapshot(): Breakpoint {
  if (!hasMatchMedia()) return classifyWidth(window.innerWidth)
  const [tablet, desktop, wide] = queries.map((q) => window.matchMedia(q).matches)
  return wide ? 'wide' : desktop ? 'desktop' : tablet ? 'tablet' : 'mobile'
}

function subscribe(onChange: () => void): () => void {
  if (!hasMatchMedia()) {
    window.addEventListener('resize', onChange)
    return () => window.removeEventListener('resize', onChange)
  }
  const lists = queries.map((q) => window.matchMedia(q))
  lists.forEach((list) => list.addEventListener('change', onChange))
  return () => lists.forEach((list) => list.removeEventListener('change', onChange))
}

/** The current breakpoint, updated when the viewport crosses 768, 1024 or 1280 px. */
export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'desktop')
}
