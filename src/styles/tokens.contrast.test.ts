import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function parseVars(body: string): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]!] = m[2]!.trim()
  return vars
}

function blockBody(selector: RegExp): string {
  const m = selector.exec(css)
  if (!m) throw new Error(`block not found: ${selector}`)
  let depth = 1
  let i = m.index + m[0].length
  const start = i
  while (depth > 0 && i < css.length) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') depth--
    i++
  }
  return css.slice(start, i - 1)
}

// First plain `:root {` block holds the private palette.
const palette = parseVars(blockBody(/^:root\s*\{/m))
const light = parseVars(blockBody(/^:root,\s*\[data-theme='light'\]\s*\{/m))
const dark = parseVars(blockBody(/^\[data-theme='dark'\]\s*\{/m))

function resolveVar(name: string, theme: Record<string, string>, seen = new Set<string>()): string {
  if (seen.has(name)) throw new Error(`cycle at ${name}`)
  seen.add(name)
  const raw = theme[name] ?? palette[name]
  if (raw === undefined) throw new Error(`undefined var ${name}`)
  const ref = /^var\((--[\w-]+)\)$/.exec(raw)
  return ref ? resolveVar(ref[1]!, theme, seen) : raw
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) throw new Error(`not a 6-digit hex: ${hex}`)
  const n = parseInt(m[1]!, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const textPairs: [string, string][] = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['text', 'surface-raised'],
  ['text', 'sidebar'],
  ['text-muted', 'bg'],
  ['text-muted', 'surface'],
  ['text-muted', 'surface-raised'],
  ['text-muted', 'sidebar'],
  ['text-subtle', 'bg'],
  ['text-subtle', 'surface'],
  ['text-subtle', 'surface-raised'],
  ['text-subtle', 'sidebar'],
  ['accent-fg', 'accent'],
  ['accent-fg', 'accent-hover'],
  ['accent-text', 'bg'],
  ['accent-text', 'surface'],
  ['ink-fg', 'ink'],
  ['danger-fg', 'danger'],
  ['danger-fg', 'danger-hover'],
  ['success-text', 'success-bg'],
  ['warning-text', 'warning-bg'],
  ['danger-text', 'danger-bg'],
]

const uiPairs: [string, string][] = [
  ['border-strong', 'bg'],
  ['border-strong', 'surface'],
  ['border-strong', 'sidebar'],
  ['focus-ring', 'bg'],
  ['focus-ring', 'surface'],
  ['focus-ring', 'surface-raised'],
  ['accent', 'bg'],
  ['accent', 'surface'],
]

describe('tokens.css contrast (WCAG 2.x)', () => {
  it('parses the expected blocks', () => {
    expect(Object.keys(palette).length).toBeGreaterThan(10)
    expect(light['--bg']).toBeDefined()
    expect(dark['--bg']).toBeDefined()
  })

  for (const [themeName, theme] of [
    ['light', light],
    ['dark', dark],
  ] as const) {
    describe(`${themeName} theme`, () => {
      it.each(textPairs)('text pair %s on %s is >= 4.5:1', (fg, bg) => {
        const ratio = contrast(resolveVar(`--${fg}`, theme), resolveVar(`--${bg}`, theme))
        expect(ratio, `${fg}/${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
      })

      it.each(uiPairs)('UI pair %s on %s is >= 3:1', (fg, bg) => {
        const ratio = contrast(resolveVar(`--${fg}`, theme), resolveVar(`--${bg}`, theme))
        expect(ratio, `${fg}/${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(3)
      })
    })
  }
})
