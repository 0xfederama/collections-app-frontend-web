import { useRef, useState, type FormEvent } from 'react'
import { Button, Dialog, TextField } from '../../components/ui'
import { FormError } from './FormError'
import { useAction } from './useAction'

export interface NameDialogProps {
  title: string
  description?: string
  submitLabel: string
  noun: 'folder' | 'list'
  initialName?: string
  onSubmit: (name: string) => Promise<unknown>
  onClose: () => void
  /** Refetches the tree and returns the latest name (`undefined` if the item is gone). Rename only. */
  onReload?: () => Promise<string | undefined>
}

const MAX_LENGTH = 200

/** Create and rename dialog: one name field. The draft survives every failure. */
export function NameDialog({
  title,
  description,
  submitLabel,
  noun,
  initialName = '',
  onSubmit,
  onClose,
  onReload,
}: NameDialogProps) {
  const [name, setName] = useState(initialName)
  const [fieldError, setFieldError] = useState<string>()
  const inputRef = useRef<HTMLInputElement>(null)
  const { error, pending, run, clearError, setError } = useAction(noun)

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setFieldError('Enter a name.')
    if (trimmed.length > MAX_LENGTH) return setFieldError(`Use at most ${MAX_LENGTH} characters.`)
    setFieldError(undefined)
    if (await run(() => onSubmit(trimmed))) onClose()
  }

  const reload = async () => {
    const latest = await onReload?.()
    if (latest === undefined) {
      setError({
        kind: 'not_found',
        message: `This ${noun} no longer exists. The list of collections was refreshed.`,
        fieldErrors: [],
      })
      return
    }
    setName(latest)
    setFieldError(undefined)
    clearError()
  }

  // A 422 that names the field is shown on the field, everything else in the alert.
  const serverField = error?.kind === 'validation' ? error.message : undefined

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={title}
      description={description}
      initialFocus={inputRef}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="tree-name-form" pending={pending}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id="tree-name-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={MAX_LENGTH}
          autoComplete="off"
          ref={inputRef}
          error={fieldError ?? serverField}
        />
        {error && !serverField && (
          <FormError
            error={error}
            pending={pending}
            onReload={onReload ? () => void reload() : undefined}
            onRetry={() => void submit()}
          />
        )}
      </form>
    </Dialog>
  )
}
