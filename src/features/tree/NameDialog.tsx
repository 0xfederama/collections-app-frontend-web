import { useRef, useState, type FormEvent } from 'react'
import { Button, Dialog, Select, TextField, kindLabels, type ItemKind } from '../../components/ui'
import { DestinationPicker, type DestinationOption } from './DestinationPicker'
import { destinationId, destinationKey } from './MoveDialog'
import { FormError } from './FormError'
import { useAction } from './useAction'

export interface NameDialogProps {
  title: string
  description?: string
  submitLabel: string
  noun: 'folder' | 'list'
  initialName?: string
  /** Create list only: shows the kind picker, starting at `initial`. Renaming never changes the kind. */
  kind?: { initial: ItemKind }
  /**
   * Create list only: the folder the list goes into, as the shared destination picker. Renaming
   * and the folder dialog have none, and never move anything.
   */
  path?: { options: DestinationOption[]; initial: string | null }
  /** `folderId` is the chosen path on create (`null` = top level); rename ignores it. */
  onSubmit: (name: string, kind: ItemKind, folderId: string | null) => Promise<unknown>
  onClose: () => void
  /** Refetches the tree and returns the latest name (`undefined` if the item is gone). Rename only. */
  onReload?: () => Promise<string | undefined>
  /** Where focus goes when the dialog closes; `preventDefault()` replaces the return to the opener. */
  onCloseAutoFocus?: (event: Event) => void
}

const MAX_LENGTH = 200

const kindOptions = (Object.keys(kindLabels) as ItemKind[]).map((value) => ({
  value,
  label: kindLabels[value],
}))

/** Create and rename dialog: one name field, plus the kind and the folder on a new list. */
export function NameDialog({
  title,
  description,
  submitLabel,
  noun,
  initialName = '',
  kind,
  path,
  onSubmit,
  onClose,
  onReload,
  onCloseAutoFocus,
}: NameDialogProps) {
  const [name, setName] = useState(initialName)
  const [chosenKind, setChosenKind] = useState<ItemKind>(kind?.initial ?? 'generic')
  // The remembered folder may be gone (deleted, or from an older tree), and then there is no
  // option to preselect: the top level does, so the picker is never left with nothing chosen.
  const [chosenPath, setChosenPath] = useState<string | undefined>(() => {
    if (!path) return undefined
    const initial = destinationKey(path.initial)
    return path.options.some((option) => option.key === initial) ? initial : destinationKey(null)
  })
  const [fieldError, setFieldError] = useState<string>()
  const inputRef = useRef<HTMLInputElement>(null)
  const { error, pending, run, clearError, setError } = useAction(noun)

  const selectedFolder = path?.options.find((option) => option.key === chosenPath)
  const selectedName = selectedFolder?.name

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setFieldError('Enter a name.')
    if (trimmed.length > MAX_LENGTH) return setFieldError(`Use at most ${MAX_LENGTH} characters.`)
    setFieldError(undefined)
    const folderId = path ? destinationId(chosenPath ?? destinationKey(null)) : null
    if (await run(() => onSubmit(trimmed, chosenKind, folderId))) onClose()
  }

  const reload = async () => {
    const latest = await onReload?.()
    if (latest === undefined) {
      setError({
        kind: 'not_found',
        message: `This ${noun} no longer exists. The folders and lists were refreshed.`,
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
      description={
        // With a path picker the description follows the choice; the old text was fixed per opener.
        path
          ? selectedName && selectedName !== 'Top level'
            ? `It will be created inside “${selectedName}”.`
            : 'It will be created at the top level.'
          : description
      }
      initialFocus={inputRef}
      onCloseAutoFocus={onCloseAutoFocus}
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
        {kind && (
          <Select
            label="Kind"
            hint="Every item in the list has this kind."
            options={kindOptions}
            value={chosenKind}
            onValueChange={(value) => setChosenKind(value as ItemKind)}
          />
        )}
        {path && (
          <DestinationPicker
            label="Folder"
            options={path.options}
            value={chosenPath}
            onChange={setChosenPath}
          />
        )}
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
