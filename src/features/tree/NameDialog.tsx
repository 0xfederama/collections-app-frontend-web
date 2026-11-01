import { useId, useRef, useState, type FormEvent } from 'react'
import {
  Button,
  Dialog,
  IconButton,
  Select,
  TextField,
  type ItemType,
  type SelectEntry,
  type SelectOption,
} from '../../components/ui'
import { cx } from '../../lib/cx'
import { destinationId, destinationKey } from './MoveDialog'
import { FormError } from './FormError'
import { useAction } from './useAction'
import { ListIconPicker, ListIconMark, type IconChoice } from '../lists'
import { useTypes } from '../settings'
import { typeDefinition, typeOptions as buildTypeOptions, typeToValue, valueToType } from '../items'
export interface NameDialogProps {
  title: string
  description?: string
  submitLabel: string
  noun: 'folder' | 'list'
  initialName?: string
  /** Create list only: shows the type picker, starting at `initial`. Renaming never changes the type. */
  type?: { initial: ItemType }
  /**
   * Create list only: the folder the list goes into, as the shared destination picker. Renaming
   * and the folder dialog have none, and never move anything.
   */
  path?: { options: SelectOption[]; initial: string | null }
  /** Create list only: enables an optional icon choice. */
  listIcon?: boolean
  /** `folderId` is the chosen path on create (`null` = top level); rename ignores it. */
  onSubmit: (
    name: string,
    type: ItemType,
    folderId: string | null,
    icon: IconChoice,
  ) => Promise<unknown>
  onClose: () => void
  /** Refetches the tree and returns the latest name (`undefined` if the item is gone). Rename only. */
  onReload?: () => Promise<string | undefined>
  /** Where focus goes when the dialog closes; `preventDefault()` replaces the return to the opener. */
  onCloseAutoFocus?: (event: Event) => void
}

const MAX_LENGTH = 200

/** Create and rename dialog: one name field, plus the type and the folder on a new list. */
export function NameDialog({
  title,
  description,
  submitLabel,
  noun,
  initialName = '',
  type,
  path,
  listIcon,
  onSubmit,
  onClose,
  onReload,
  onCloseAutoFocus,
}: NameDialogProps) {
  const definitions = useTypes()
  const typeOptions: SelectEntry[] = buildTypeOptions(definitions.data)
  const [name, setName] = useState(initialName)
  const [chosenType, setChosenType] = useState<ItemType>(type?.initial ?? null)
  const [iconChoice, setIconChoice] = useState<IconChoice>({ icon: null, icon_color: null })
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  // The remembered folder may be gone (deleted, or from an older tree), and then there is no
  // option to preselect: the top level does, so the picker is never left with nothing chosen.
  const [chosenPath, setChosenPath] = useState<string | undefined>(() => {
    if (!path) return undefined
    const initial = destinationKey(path.initial)
    return path.options.some((option) => option.value === initial) ? initial : destinationKey(null)
  })
  const [fieldError, setFieldError] = useState<string>()
  const iconControlId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const { error, pending, run, clearError, setError } = useAction(noun)

  const selectedLabel = path?.options.find((option) => option.value === chosenPath)?.label
  const selectedType = typeDefinition(definitions.data, chosenType)

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setFieldError('Enter a name.')
    if (trimmed.length > MAX_LENGTH) return setFieldError(`Use at most ${MAX_LENGTH} characters.`)
    setFieldError(undefined)
    const folderId = path ? destinationId(chosenPath ?? destinationKey(null)) : null
    if (await run(() => onSubmit(trimmed, chosenType, folderId, iconChoice))) onClose()
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
          ? selectedLabel && selectedLabel !== 'Top level'
            ? `It will be created inside “${selectedLabel}”.`
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
        <div className={cx(listIcon && 'grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3')}>
          <div className="min-w-0">
            <TextField
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={MAX_LENGTH}
              autoComplete="off"
              ref={inputRef}
              error={fieldError ?? serverField}
            />
          </div>
          {listIcon && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={iconControlId} className="text-ui font-medium text-text">
                Icon
              </label>
              <IconButton
                id={iconControlId}
                aria-label="Choose icon"
                variant="secondary"
                className="size-10 pointer-coarse:size-11"
                onClick={() => setIconPickerOpen(true)}
              >
                <ListIconMark
                  icon={iconChoice.icon ?? selectedType?.default_icon}
                  iconColor={iconChoice.icon_color}
                  type={chosenType}
                  className="size-8"
                  iconClassName="size-4"
                />
              </IconButton>
            </div>
          )}
        </div>
        {/* F011-W6: Type and Folder sit side by side, the folder as a dropdown on the right. */}
        {(type || path) && (
          <div className={cx('grid gap-4', type && path && 'sm:grid-cols-2')}>
            {type && (
              <Select
                label="Type"
                hint="Every item in the list has this type."
                options={typeOptions}
                value={typeToValue(chosenType)}
                onValueChange={(value) => setChosenType(valueToType(value))}
              />
            )}
            {path && (
              <Select
                label="Folder"
                options={path.options}
                value={chosenPath}
                onValueChange={setChosenPath}
              />
            )}
          </div>
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
      {iconPickerOpen && (
        <ListIconPicker
          value={iconChoice}
          type={chosenType}
          onChange={setIconChoice}
          onClose={() => setIconPickerOpen(false)}
        />
      )}
    </Dialog>
  )
}
