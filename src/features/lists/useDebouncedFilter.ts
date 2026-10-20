import { useEffect, useState } from 'react'
import type { useSearchParams } from 'react-router'

const FILTER_DEBOUNCE_MS = 250

type SetSearchParams = ReturnType<typeof useSearchParams>[1]

/**
 * The list's title filter: the field updates at once, the `?q=` URL follows after a pause, and a `q`
 * changed elsewhere (back/forward) becomes the field's value.
 */
export function useDebouncedFilter(
  q: string,
  setSearchParams: SetSearchParams,
): [string, (value: string) => void] {
  const [filter, setFilter] = useState(q)
  useEffect(() => {
    if (filter.trim() === q) return
    const timer = setTimeout(() => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (filter.trim()) next.set('q', filter.trim())
          else next.delete('q')
          return next
        },
        { replace: true },
      )
    }, FILTER_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [filter, q, setSearchParams])
  // The URL changed elsewhere (back/forward): the field follows it.
  const [seenQ, setSeenQ] = useState(q)
  if (q !== seenQ) {
    setSeenQ(q)
    if (filter.trim() !== q) setFilter(q)
  }
  return [filter, setFilter]
}
