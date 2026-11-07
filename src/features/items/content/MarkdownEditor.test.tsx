import { render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import MarkdownEditor from './MarkdownEditor'

// The setup file replaces the editor with a textarea; this file tests the real one.
vi.unmock('./MarkdownEditor')

describe('AT-08 web: MarkdownEditor (CodeMirror)', () => {
  it('exposes an accessible multiline textbox with the initial text', async () => {
    render(<MarkdownEditor value="# Hello" onChange={() => {}} label="Description (Markdown)" />)
    const box = await screen.findByRole('textbox', { name: 'Description (Markdown)' })
    expect(box).toHaveAttribute('aria-multiline', 'true')
    expect(box).toHaveTextContent('# Hello')
  })

  it('applies an external value change to the document', async () => {
    const onChange = vi.fn()
    function Host() {
      const [value, setValue] = useState('one')
      return (
        <>
          <button onClick={() => setValue('two')}>swap</button>
          <MarkdownEditor
            value={value}
            onChange={(next) => {
              onChange(next)
              setValue(next)
            }}
            label="Body"
          />
        </>
      )
    }
    render(<Host />)
    const box = await screen.findByRole('textbox', { name: 'Body' })
    expect(box).toHaveTextContent('one')
    screen.getByRole('button', { name: 'swap' }).click()
    await waitFor(() => expect(box).toHaveTextContent('two'))
  })

  it('keeps the text selectable (no user-select: none on the editor or its content)', async () => {
    render(<MarkdownEditor value="select me" onChange={() => {}} label="Body" />)
    const box = await screen.findByRole('textbox', { name: 'Body' })
    const content = box.closest('.cm-editor')?.querySelector('.cm-content')
    expect(content).toBeTruthy()
    for (const element of [box.closest('.cm-editor'), content]) {
      const style = getComputedStyle(element as Element)
      expect(style.userSelect).toBe('text')
      expect(style.getPropertyValue('-webkit-user-select')).toBe('text')
    }
  })
})
