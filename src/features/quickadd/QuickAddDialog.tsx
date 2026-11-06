import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Dialog, useToast } from '../../components/ui'
import { useBreakpoint } from '../../lib/breakpoints'
import {
  useCreateItem,
  ADDED_TOAST,
  TitleLookupField,
  createLookupSelection,
  isBookLookup,
  lookupSourceName,
  type Item,
  type LookupSelection,
  type LookupTitleSelection,
} from '../items'
import { invalidateContent } from '../../data/invalidate'
import { useSettings } from '../settings'
import { ListPicker, useListChoices } from './ListPicker'
import { QuickAddFooter, QuickAddStatus } from './QuickAddFooter'
import { describeCreateFailure, resolveListId, validateQuickAdd, type Field } from './model'

/**
 * Quick add (F-002): a title and a destination list, nothing else (web 2.29.2); the other details
 * are edited on the item page. Enter adds, Esc cancels.
 * On phones (F-025 W13) the list stays on screen and the toast's "Open" action opens the item.
 */
export function QuickAddDialog({
  initialListId,
  onClose,
}: {
  initialListId?: string
  onClose: () => void
}) {
  const { lists, loading } = useListChoices()
  const settings = useSettings()
  const navigate = useNavigate()
  const phone = useBreakpoint() === 'mobile'
  const toast = useToast()
  const queryClient = useQueryClient()
  const [pickedList, setPickedList] = useState<string>()
  const listId = resolveListId(lists, pickedList, initialListId)
  const listType = lists.find((list) => list.id === listId)?.type ?? null
  const sourceName = lookupSourceName(listType)

  const [title, setTitle] = useState('')
  const [chosen, setChosen] = useState<LookupSelection>({})
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [formError, setFormError] = useState<string>()
  const [lookupUnavailable, setLookupUnavailable] = useState(false)
  const [busy, setBusy] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  const create = useCreateItem(listId ?? '')

  const submit = async (event?: FormEvent, lookup?: boolean, selection?: LookupTitleSelection) => {
    event?.preventDefault()
    if (busy) return
    const trimmed = (selection?.title ?? title).trim()
    const { errors: next, focus } = validateQuickAdd({
      title: selection?.title ?? title,
      listId,
    })
    setErrors(next)
    setFormError(undefined)
    if (focus === 'title') return titleRef.current?.focus()
    if (next.list || !listId) return

    setBusy(true)
    let created: Item
    try {
      created = await create.mutateAsync({
        title: trimmed,
        ...createLookupSelection(listType, settings.data, selection ?? chosen),
        ...(lookup === undefined ? {} : { lookup }),
      })
    } catch (caught) {
      setBusy(false)
      const failure = describeCreateFailure(caught, listType)
      setLookupUnavailable(failure.lookupUnavailable)
      if (failure.errors) setErrors(failure.errors)
      if (failure.focus === 'title') titleRef.current?.focus()
      if (!failure.keepFormError) setFormError(failure.formError)
      return
    }

    void invalidateContent(queryClient)
    const itemPath = `/lists/${listId}/items/${created.id}`
    // Phones (F-025 W13): the toast opens the item; the user stays on the current page.
    const opened = phone
      ? { action: { label: 'Open', onAction: () => void navigate(itemPath) } }
      : {}
    toast({ ...ADDED_TOAST, title: `Added “${created.title}”`, ...opened })
    onClose()
    if (!phone) void navigate(itemPath)
  }

  const dismiss = (key: Field) => setErrors((e) => ({ ...e, [key]: undefined }))

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      title="Quick add"
      description="Type a title and press Enter."
      hideTitle
      className="max-w-xl"
      initialFocus={titleRef}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the form is only a wrapper: Enter from the inputs inside is forwarded here, and the controls are the keyboard path */}
      <form
        id="quick-add-form"
        onSubmit={(event) => void submit(event)}
        onKeyDown={(event) => {
          // Enter in any text input adds, even where the browser would not submit implicitly.
          const target = event.target as HTMLInputElement
          if (event.key === 'Enter' && target.tagName === 'INPUT' && target.type === 'text') {
            event.preventDefault()
            void submit()
          }
        }}
        noValidate
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1 pr-10">
          <TitleLookupField
            type={listType}
            title={title}
            onTitleChange={(value) => {
              setTitle(value)
              dismiss('title')
            }}
            onSelectionChange={setChosen}
            onSuggestionSelect={(selection) => void submit(undefined, undefined, selection)}
            inputRef={titleRef}
            error={errors.title}
            placeholder="Title"
            className="w-full"
            inputClassName="w-full border-b border-transparent bg-transparent pb-1 font-display text-section text-text outline-none placeholder:text-text-muted focus-visible:border-accent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ListPicker
            lists={lists}
            loading={loading}
            listId={listId}
            error={errors.list}
            onPick={(value) => {
              setPickedList(value)
              setChosen({})
            }}
          />
        </div>

        <QuickAddStatus
          lookupPending={create.isPending && isBookLookup(listType, settings.data)}
          lookupUnavailable={lookupUnavailable}
          sourceName={sourceName}
          formError={formError}
          onRetryLookup={() => void submit(undefined)}
          onAddWithoutLookup={() => void submit(undefined, false)}
        />
        <QuickAddFooter busy={busy} onCancel={onClose} />
      </form>
    </Dialog>
  )
}
