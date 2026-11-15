import { useEffect, useState, type RefObject } from 'react'
import { Button, IconButton } from '../../components/ui'
import { Shuffle, X } from '../../components/ui/icons'
import { useBreakpoint } from '../../lib/breakpoints'
import { pickRandom } from './movieExtras'

const HIGHLIGHT_MS = 1600

/**
 * Runs `run` once no modal (the "…" menu that started the pick) locks the page scroll any more:
 * Radix's scroll lock (`data-scroll-locked` on body) swallows scrollIntoView while the menu fades out,
 * which on phones (the document scrolls) left the row off screen. Gives up waiting after 1 s.
 */
function whenScrollUnlocked(run: () => void): () => void {
  const started = performance.now()
  let frame = 0
  const tick = () => {
    const locked = document.body.hasAttribute('data-scroll-locked')
    if (!locked || performance.now() - started > 1000) run()
    else frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(frame)
}

const reducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * "Pick a random movie" (roadmap 36, D-160): uniform among the rows shown now (search, filters and
 * availability already applied by the query), client side only, never saved. The row scrolls into
 * view and is highlighted for a moment; where a tap opens the item beside the list (the panel, ≥ 1280)
 * it opens too, else the banner offers Open so "Pick another" stays at hand.
 */
export function useRandomPick(
  root: RefObject<HTMLElement | null>,
  items: readonly { id: string; title: string }[],
  random: () => number = Math.random,
) {
  const [pickedId, setPickedId] = useState<string | null>(null)
  // Each pick is a new request; `open` is decided at pick time (a tap opens the panel only when wide).
  const [request, setRequest] = useState<{ round: number; open: boolean } | null>(null)
  const wide = useBreakpoint() === 'wide'
  const picked = items.find((item) => item.id === pickedId) ?? null

  const row = (id: string) => root.current?.querySelector<HTMLElement>(`li[data-item-id="${id}"]`)
  // Opening = clicking the row's title link, exactly what a tap does.
  const open = (id: string) => row(id)?.querySelector<HTMLAnchorElement>('a[href]')?.click()

  const pick = () => {
    const next = pickRandom(
      items.map((item) => item.id),
      picked?.id ?? null,
      random,
    )
    if (next === null) return
    setPickedId(next)
    setRequest((current) => ({ round: (current?.round ?? 0) + 1, open: wide }))
  }

  // After the render that shows the banner: scroll, highlight, and open on wide screens.
  useEffect(() => {
    if (!request || !pickedId) return
    const element = root.current?.querySelector<HTMLElement>(`li[data-item-id="${pickedId}"]`)
    // (Same lookup as `row`, inlined so the effect depends only on stable values.)
    if (!element) return
    let timer = 0
    const cancel = whenScrollUnlocked(() => {
      element.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' })
      element.setAttribute('data-picked', '')
      timer = window.setTimeout(() => element.removeAttribute('data-picked'), HIGHLIGHT_MS)
      if (request.open) element.querySelector<HTMLAnchorElement>('a[href]')?.click()
    })
    return () => {
      cancel()
      window.clearTimeout(timer)
      element.removeAttribute('data-picked')
    }
  }, [request, pickedId, root])

  // A live region that is always mounted, so screen readers hear every pick.
  const status = (
    <p role="status" className="sr-only">
      {picked ? `Random pick: ${picked.title}` : ''}
    </p>
  )
  const banner = picked ? (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-ui">
      <Shuffle aria-hidden className="size-4 shrink-0 text-text-muted" />
      <p aria-hidden className="line-clamp-2 min-w-48 flex-1">
        Random pick: <strong className="font-semibold">{picked.title}</strong>
      </p>
      <div className="flex items-center gap-1">
        {!wide && (
          <Button variant="secondary" onClick={() => open(picked.id)}>
            Open
          </Button>
        )}
        {items.length > 1 && (
          <Button variant="secondary" onClick={pick}>
            Pick another
          </Button>
        )}
        <IconButton aria-label="Dismiss random pick" onClick={() => setPickedId(null)}>
          <X aria-hidden />
        </IconButton>
      </div>
    </div>
  ) : null

  return { pick, banner, status, pickedId: picked?.id ?? null }
}
