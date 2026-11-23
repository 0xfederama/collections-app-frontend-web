import { useRef, useState } from 'react'
import { Button, Dialog, TextArea } from '../../components/ui'
import { copyText } from './shareFlow'

/** Fallback of Share: the text, selected, with a Copy button (no system share sheet on this origin). */
export function ShareDialog({
  open,
  onOpenChange,
  listName,
  text,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  listName: string
  text: string
}) {
  const field = useRef<HTMLTextAreaElement>(null)
  const [result, setResult] = useState<'idle' | 'copied' | 'failed'>('idle')
  const change = (next: boolean) => {
    setResult('idle')
    onOpenChange(next)
  }
  const selectAll = () => field.current?.select()
  const copy = async () => {
    // Without a secure context `navigator.clipboard` is undefined (plain http).
    const ok = await copyText(text, navigator, field.current)
    setResult(ok ? 'copied' : 'failed')
  }
  return (
    <Dialog
      open={open}
      onOpenChange={change}
      title={`Share ${listName}`}
      initialFocus={field}
      footer={
        <>
          <Button variant="secondary" onClick={() => change(false)}>
            Close
          </Button>
          <Button onClick={() => void copy()}>Copy</Button>
        </>
      }
    >
      <TextArea
        ref={field}
        label="List as text"
        readOnly
        rows={10}
        value={text}
        onFocus={selectAll}
        onClick={selectAll}
      />
      <p role="status" aria-live="polite" className="min-h-5 text-secondary text-text-muted">
        {result === 'copied'
          ? 'Copied'
          : result === 'failed'
            ? 'Select the text and copy it manually (Ctrl/Cmd+C)'
            : ''}
      </p>
    </Dialog>
  )
}
