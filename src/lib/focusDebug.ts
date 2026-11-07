import { STORAGE_KEYS, readStored, writeStored } from './storage'

/**
 * Focus and keyboard diagnostics (roadmap 28): an on-screen log of focus changes, keyboard-proxy
 * steps and the visual viewport height, to find where the iOS keyboard closes on a real phone (no
 * Simulator is available). Off by default; toggled in Settings > About or with `?focusdebug=1` /
 * `?focusdebug=0`. It only appends a text box to <body>: no network, no data leaves the page.
 */
const MAX_LINES = 14
let box: HTMLDivElement | null = null
let lines: string[] = []
let started = 0
let listening = false

const isOn = (raw: unknown) => (raw === true ? true : undefined)

export function focusDebugEnabled(): boolean {
  return readStored(STORAGE_KEYS.focusDebug, isOn, false)
}

export function setFocusDebug(on: boolean): void {
  writeStored(STORAGE_KEYS.focusDebug, on)
  if (on) startFocusDebug()
  else stopFocusDebug()
}

/** Adds a line when the overlay is on; a no-op otherwise. */
export function focusNote(message: string): void {
  if (!box) return
  const t = ((performance.now() - started) / 1000).toFixed(2)
  lines = [...lines, `${t} ${message}`].slice(-MAX_LINES)
  box.textContent = lines.join('\n')
}

function describe(target: EventTarget | null): string {
  if (!(target instanceof Element)) return 'none'
  if (target === document.body) return 'body'
  if (target instanceof HTMLElement && target.dataset.keyboardProxy !== undefined) return 'PROXY'
  const label =
    target.getAttribute('aria-label') ??
    target.getAttribute('placeholder') ??
    target.textContent?.trim().slice(0, 20) ??
    ''
  return `${target.tagName.toLowerCase()}${label ? ` "${label}"` : ''}`
}

function viewport(): string {
  const vv = window.visualViewport
  if (!vv) return 'vv ?'
  const covered = Math.round(window.innerHeight - vv.height)
  return `kb ${covered > 120 ? 'OPEN' : 'closed'} (${covered}px)`
}

const onFocusIn = (event: FocusEvent) => focusNote(`in  ${describe(event.target)}`)
const onFocusOut = (event: FocusEvent) =>
  focusNote(
    `out ${describe(event.target)} -> ${describe(event.relatedTarget)}${
      event.target instanceof Node && !event.target.isConnected ? ' (removed)' : ''
    }`,
  )
const onResize = () => focusNote(viewport())

/** Reads the URL switch, then mounts the overlay if diagnostics are on. Call once at startup. */
export function startFocusDebug(): void {
  const flag = new URLSearchParams(location.search).get('focusdebug')
  if (flag === '1' || flag === '0') writeStored(STORAGE_KEYS.focusDebug, flag === '1')
  if (!focusDebugEnabled() || box) return
  started = performance.now()
  box = document.createElement('div')
  box.setAttribute('aria-hidden', 'true')
  box.className =
    'pointer-events-none fixed right-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-2 z-[100] rounded-md bg-ink/85 p-2 font-mono text-label whitespace-pre-wrap text-ink-fg'
  document.body.append(box)
  if (!listening) {
    listening = true
    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('focusout', onFocusOut, true)
    window.visualViewport?.addEventListener('resize', onResize)
  }
  focusNote(`diagnostics on · ${viewport()}`)
}

function stopFocusDebug(): void {
  box?.remove()
  box = null
  lines = []
  if (listening) {
    listening = false
    document.removeEventListener('focusin', onFocusIn, true)
    document.removeEventListener('focusout', onFocusOut, true)
    window.visualViewport?.removeEventListener('resize', onResize)
  }
}
