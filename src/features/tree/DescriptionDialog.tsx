import { useRef, useState, type FormEvent } from 'react'
import { Button, Dialog, TextArea } from '../../components/ui'
import { FormError } from './FormError'
import { useAction } from './useAction'

const MAX_LENGTH = 2000

export interface DescriptionDialogProps {
  initialDescription: string
  onSubmit: (description: string | null) => Promise<unknown>
  onClose: () => void
  /** Refetches the tree and returns the latest description (`undefined` if the list is gone). */
  onReload: () => Promise<string | null | undefined>
}

/** Edit a list's description. An empty text clears it (`null`). */
export function DescriptionDialog({
  initialDescription,
  onSubmit,
  onClose,
  onReload,
}: DescriptionDialogProps) {
  const [text, setText] = useState(initialDescription)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const { error, pending, run, clearError, setError } = useAction('list')

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    const trimmed = text.trim()
    if (await run(() => onSubmit(trimmed === '' ? null : trimmed))) onClose()
  }

  const reload = async () => {
    const latest = await onReload()
    if (latest === undefined) {
      setError({
        kind: 'not_found',
        message: 'This list no longer exists. The folders and lists were refreshed.',
        fieldErrors: [],
      })
      return
    }
    setText(latest ?? '')
    clearError()
  }

  const tooLong = text.length > MAX_LENGTH
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Edit description"
      initialFocus={textRef}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="tree-description-form" pending={pending} disabled={tooLong}>
            Save
          </Button>
        </>
      }
    >
      <form id="tree-description-form" onSubmit={submit} className="flex flex-col gap-4">
        <TextArea
          label="Description"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={5}
          ref={textRef}
          hint={`${text.length} / ${MAX_LENGTH}`}
          error={tooLong ? `Use at most ${MAX_LENGTH} characters.` : undefined}
        />
        {error && (
          <FormError
            error={error}
            pending={pending}
            onReload={() => void reload()}
            onRetry={() => void submit()}
          />
        )}
      </form>
    </Dialog>
  )
}
