import { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router'

/** The pathname the app was on before the current one (this session of the shell), `null` when opened directly. */
let previous: string | null = null
let current: string | null = null

export const getPreviousPath = (): string | null => previous

/** Mounted once in the shell: remembers the previous pathname so a page can tell where "back" would lead. */
export function useTrackPreviousPath(): void {
  const { pathname } = useLocation()
  const first = useRef(true)
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false
      previous = null
      current = pathname
      return
    }
    if (pathname !== current) {
      previous = current
      current = pathname
    }
  }, [pathname])
}
