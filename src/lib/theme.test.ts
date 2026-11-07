import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  THEME_STORAGE_KEY,
  getThemePreference,
  setThemePreference,
  useThemePreference,
} from './theme'

type Listener = () => void

function stubMatchMedia(initialDark: boolean) {
  let dark = initialDark
  const listeners = new Set<Listener>()
  const mql = {
    get matches() {
      return dark
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, l: Listener) => listeners.add(l),
    removeEventListener: (_: string, l: Listener) => listeners.delete(l),
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql),
  )
  return {
    set(next: boolean) {
      dark = next
      listeners.forEach((l) => l())
    },
    listenerCount: () => listeners.size,
  }
}

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
  stubMatchMedia(false)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('theme storage key', () => {
  it('is collection:theme (must match index.html)', () => {
    expect(THEME_STORAGE_KEY).toBe('collection:theme')
  })
})

describe('getThemePreference', () => {
  it('defaults to system', () => {
    expect(getThemePreference()).toBe('system')
  })

  it.each(['light', 'dark', 'system'] as const)('returns stored %s', (value) => {
    localStorage.setItem(THEME_STORAGE_KEY, value)
    expect(getThemePreference()).toBe(value)
  })

  it.each(['', 'purple', 'DARK', 'null'])('ignores junk value %j', (value) => {
    localStorage.setItem(THEME_STORAGE_KEY, value)
    expect(getThemePreference()).toBe('system')
  })

  it('tolerates storage throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(getThemePreference()).toBe('system')
  })
})

describe('setThemePreference', () => {
  it.each(['light', 'dark'] as const)('persists %s and applies it', (pref) => {
    setThemePreference(pref)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(pref)
    expect(document.documentElement.dataset.theme).toBe(pref)
  })

  it('system removes the key and follows matchMedia (dark)', () => {
    setThemePreference('light')
    stubMatchMedia(true)
    setThemePreference('system')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('system follows matchMedia (light)', () => {
    setThemePreference('dark')
    setThemePreference('system')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('still applies the theme when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => setThemePreference('dark')).not.toThrow()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(() => setThemePreference('system')).not.toThrow()
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})

describe('useThemePreference', () => {
  it('reports system preference and resolved theme initially', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() => useThemePreference())
    expect(result.current.preference).toBe('system')
    expect(result.current.resolved).toBe('dark')
  })

  it('updates when setPreference is called', () => {
    const { result } = renderHook(() => useThemePreference())
    act(() => result.current.setPreference('dark'))
    expect(result.current.preference).toBe('dark')
    expect(result.current.resolved).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('reacts to a matchMedia change in system mode', () => {
    const media = stubMatchMedia(false)
    const { result } = renderHook(() => useThemePreference())
    expect(result.current.resolved).toBe('light')
    act(() => media.set(true))
    expect(result.current.resolved).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    act(() => media.set(false))
    expect(result.current.resolved).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('does not override an explicit preference on matchMedia change', () => {
    const media = stubMatchMedia(false)
    const { result } = renderHook(() => useThemePreference())
    act(() => result.current.setPreference('light'))
    act(() => media.set(true))
    expect(result.current.resolved).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('removes its matchMedia listener on unmount', () => {
    const media = stubMatchMedia(false)
    const { unmount } = renderHook(() => useThemePreference())
    expect(media.listenerCount()).toBeGreaterThan(0)
    unmount()
    expect(media.listenerCount()).toBe(0)
  })
})

describe('D-139 theme-color follows a forced theme', () => {
  const metas = () => [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')]
  beforeEach(() => {
    document.head.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.remove())
    document.head.insertAdjacentHTML(
      'beforeend',
      '<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">' +
        '<meta name="theme-color" content="#0b0b0c" media="(prefers-color-scheme: dark)">',
    )
  })
  afterEach(() => setThemePreference('system'))

  it.each([
    ['dark', '#0b0b0c'],
    ['light', '#ffffff'],
  ] as const)('forced %s paints both metas %s without media', (pref, color) => {
    setThemePreference(pref)
    expect(metas().map((meta) => [meta.content, meta.getAttribute('media')])).toEqual([
      [color, null],
      [color, null],
    ])
  })

  it('system restores the per-scheme metas', () => {
    setThemePreference('dark')
    setThemePreference('system')
    expect(metas().map((meta) => [meta.content, meta.getAttribute('media')])).toEqual([
      ['#ffffff', '(prefers-color-scheme: light)'],
      ['#0b0b0c', '(prefers-color-scheme: dark)'],
    ])
  })
})
