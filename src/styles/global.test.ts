import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(__dirname, 'global.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const indexHtml = readFileSync(resolve(__dirname, '../../index.html'), 'utf8')

/** Brace depth at `index`: 0 means the position is at the top level of the stylesheet (unlayered). */
function depthAt(index: number): number {
  let depth = 0
  for (let i = 0; i < index; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') depth--
  }
  return depth
}

/** The body of the first `@media (pointer: coarse)` block, and where it starts. */
function coarseBlock(): { body: string; index: number } {
  const m = /@media \(pointer: coarse\)\s*\{/.exec(css)
  if (!m) throw new Error('no @media (pointer: coarse) block')
  let depth = 1
  let i = m.index + m[0].length
  const start = i
  while (depth > 0 && i < css.length) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') depth--
    i++
  }
  return { body: css.slice(start, i - 1), index: m.index }
}

describe('F-025 W1 no zoom on focus', () => {
  it('sets every form control and rich-text editor to at least 16px on coarse pointers', () => {
    const { body, index } = coarseBlock()
    // Unlayered: the rule must sit at the top level so it beats the utilities in the layers.
    expect(depthAt(index)).toBe(0)
    for (const selector of [
      'input',
      'select',
      'textarea',
      '.cm-content',
      "[contenteditable]:not([contenteditable='false'])",
    ]) {
      expect(body).toMatch(
        new RegExp(`(^|[\\s,])${selector.replace(/[.[\]()':=]/g, '\\$&')}[\\s,{]`),
      )
    }
    expect(body).toContain('font-size: max(16px, 1em);')
  })

  it('keeps pinch zoom: the viewport has no maximum-scale', () => {
    expect(indexHtml).toMatch(/<meta name="viewport" content="[^"]*"/)
    expect(indexHtml).not.toMatch(/maximum-scale|user-scalable/)
  })
})
