import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { useEffect, useRef } from 'react'

/**
 * Colors come from our CSS variables, so the editor follows the light/dark theme with no JS.
 *
 * Selection is the browser's own: the text stays selectable and the iOS copy/paste/select callout
 * is the default one (no `user-select: none`, no `-webkit-touch-callout: none`, no touch or mouse
 * handler on the wrappers). `drawSelection()` is not used because it hides the native selection.
 */
const theme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--surface)',
    color: 'var(--text)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.875rem',
    userSelect: 'text',
    WebkitUserSelect: 'text',
    WebkitTouchCallout: 'default',
  },
  '&.cm-focused': { outline: '2px solid var(--focus-ring)', outlineOffset: '2px' },
  '.cm-scroller': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    minHeight: '14rem',
  },
  '.cm-content': {
    padding: '0.75rem',
    caretColor: 'var(--text)',
    userSelect: 'text',
    WebkitUserSelect: 'text',
    WebkitTouchCallout: 'default',
  },
  '.cm-cursor': { borderLeftColor: 'var(--text)' },
  '.cm-placeholder': { color: 'var(--text-muted)' },
})

const highlight = HighlightStyle.define([
  { tag: tags.heading, fontWeight: '700', color: 'var(--accent-text)' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.link, color: 'var(--accent-text)' },
  { tag: tags.url, color: 'var(--accent-text)', textDecoration: 'underline' },
  { tag: tags.monospace, color: 'var(--text-muted)' },
  {
    tag: [tags.quote, tags.processingInstruction, tags.contentSeparator],
    color: 'var(--text-muted)',
  },
])

export interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  /** Accessible name of the editable area. */
  label: string
  placeholderText?: string
  id?: string
  /** Focus the editor, caret at the end, when it opens (an editor the user just asked for). */
  autoFocus?: boolean
}

/**
 * CodeMirror 6 Markdown source editor (D-024). Default export so it can be `lazy()`-loaded: the
 * CodeMirror chunk downloads only when edit mode opens.
 *
 * Tab is deliberately NOT bound (`indentWithTab` is not used): CodeMirror's default leaves Tab to
 * the browser, so keyboard users are never trapped (WCAG 2.1.2).
 */
export default function MarkdownEditor({
  value,
  onChange,
  label,
  placeholderText,
  id,
  autoFocus,
}: MarkdownEditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  useEffect(() => {
    const editor = new EditorView({
      parent: host.current ?? undefined,
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          markdown(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.lineWrapping,
          syntaxHighlighting(highlight),
          theme,
          placeholder(placeholderText ?? ''),
          EditorView.contentAttributes.of({ 'aria-label': label, 'aria-multiline': 'true' }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString())
          }),
        ],
      }),
    })
    view.current = editor
    if (autoFocus) {
      editor.dispatch({ selection: { anchor: editor.state.doc.length } })
      editor.focus()
    }
    return () => {
      editor.destroy()
      view.current = null
    }
    // The editor is created once; later `value` changes are applied by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, placeholderText, autoFocus])

  // External changes (Reload latest, Restore) replace the document; typing echoes the same string.
  useEffect(() => {
    const editor = view.current
    if (editor && editor.state.doc.toString() !== value) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } })
    }
  }, [value])

  return <div ref={host} id={id} />
}
