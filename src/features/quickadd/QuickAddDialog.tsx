import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Dialog, useToast } from '../../components/ui'
import { useBreakpoint } from '../../lib/breakpoints'
import {
  useCreateItem,
  TitleLookupField,
  createLookupSelection,
  isBookLookup,
  lookupSourceName,
  useSaveContent,
  putImageFile,
  type Item,
  type LookupSelection,
  type LookupTitleSelection,
} from '../items'
import { errorMessage } from '../../lib/api'
import { invalidateContent } from '../../data/invalidate'
import { itemKeys } from '../../data/keys'
import { useSettings } from '../settings'
import { ListPicker, useListChoices } from './ListPicker'
import { OptionalSections, RevealButtons } from './OptionalFields'
import { QuickAddFooter, QuickAddStatus } from './QuickAddFooter'
import { describeCreateFailure, resolveListId, validateQuickAdd, type Field } from './model'

/**
 * Quick add (F-002): a title, a destination list and, optionally, a website, a Markdown description
 * and an image. Enter adds, Esc cancels. The item is created first; the description and the image
 * are separate requests after it, so if one fails the item still opens and a toast says what.
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
  const { pathname } = useLocation()
  const phone = useBreakpoint() === 'mobile'
  const toast = useToast()
  const queryClient = useQueryClient()
  const [pickedList, setPickedList] = useState<string>()
  const listId = resolveListId(lists, pickedList, initialListId)
  const listType = lists.find((list) => list.id === listId)?.type ?? null
  const sourceName = lookupSourceName(listType)

  const [title, setTitle] = useState('')
  const [chosen, setChosen] = useState<LookupSelection>({})
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File>()
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [formError, setFormError] = useState<string>()
  const [lookupUnavailable, setLookupUnavailable] = useState(false)
  const [busy, setBusy] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const websiteRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const chooseRef = useRef<HTMLButtonElement>(null)
  const [showWebsite, setShowWebsite] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const [showImage, setShowImage] = useState(false)

  const create = useCreateItem(listId ?? '')
  const saveContent = useSaveContent()

  const submit = async (event?: FormEvent, lookup?: boolean, selection?: LookupTitleSelection) => {
    event?.preventDefault()
    if (busy) return
    const trimmed = (selection?.title ?? title).trim()
    const site = website.trim()
    const { errors: next, focus } = validateQuickAdd({
      title: selection?.title ?? title,
      website,
      description,
      image,
      listId,
    })
    setErrors(next)
    setFormError(undefined)
    if (focus === 'title') return titleRef.current?.focus()
    if (focus === 'website') return websiteRef.current?.focus()
    if (focus === 'description') return descriptionRef.current?.focus()
    if (focus === 'image') return chooseRef.current?.focus()
    if (next.list || !listId) return

    setBusy(true)
    let created: Item
    try {
      created = await create.mutateAsync({
        title: trimmed,
        ...createLookupSelection(listType, settings.data, selection ?? chosen),
        ...(lookup === undefined ? {} : { lookup }),
        ...(site ? { website: site } : {}),
      })
    } catch (caught) {
      setBusy(false)
      const failure = describeCreateFailure(caught)
      setLookupUnavailable(failure.lookupUnavailable)
      if (failure.errors) setErrors(failure.errors)
      if (failure.focus === 'title') titleRef.current?.focus()
      else if (failure.focus === 'website') websiteRef.current?.focus()
      if (!failure.keepFormError) setFormError(failure.formError)
      return
    }

    // The item exists from here on: whatever fails below, it still opens.
    const failed: string[] = []
    if (description.trim()) {
      try {
        await saveContent.mutateAsync({
          itemId: created.id,
          listId,
          version: 0,
          body: description,
        })
      } catch {
        failed.push('the description')
      }
    }
    if (image) {
      try {
        // The content write does not change the item version, so `created.version` is current.
        const updated = await putImageFile({
          itemId: created.id,
          version: created.version,
          file: image,
        })
        queryClient.setQueryData<Item>(itemKeys.detail(created.id), updated)
      } catch (caught) {
        failed.push(`the image (${errorMessage(caught)})`)
      }
    }
    void invalidateContent(queryClient)
    const itemPath = `/lists/${listId}/items/${created.id}`
    // Phones (F-025 W13): the toast opens the item; the list is where the user ends up.
    const opened = phone
      ? { action: { label: 'Open', onAction: () => void navigate(itemPath) } }
      : {}
    if (failed.length) {
      toast({
        kind: 'error',
        title: `“${created.title}” was added, but ${failed.join(' and ')} could not be saved`,
        description: 'Open the item and edit it to add them again.',
        ...opened,
      })
    } else {
      toast({ kind: 'success', title: `Added “${created.title}”`, ...opened })
    }
    onClose()
    if (!phone) void navigate(itemPath)
    else if (pathname !== `/lists/${listId}`) void navigate(`/lists/${listId}`)
  }

  const onTextAreaKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void submit()
  }

  const reveal = (show: () => void, focus: () => void) => {
    show()
    // The field mounts on the next render.
    setTimeout(focus, 0)
  }
  const dismiss = (key: Field) => setErrors((e) => ({ ...e, [key]: undefined }))

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      title="Quick add"
      description="Type a title and press Enter. Everything else is optional."
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
          <RevealButtons
            showWebsite={showWebsite}
            setShowWebsite={setShowWebsite}
            websiteRef={websiteRef}
            showDescription={showDescription}
            setShowDescription={setShowDescription}
            descriptionRef={descriptionRef}
            showImage={showImage}
            setShowImage={setShowImage}
            chooseRef={chooseRef}
            reveal={reveal}
          />
        </div>

        <OptionalSections
          website={website}
          setWebsite={setWebsite}
          websiteRef={websiteRef}
          showWebsite={showWebsite}
          description={description}
          setDescription={setDescription}
          descriptionRef={descriptionRef}
          showDescription={showDescription}
          onTextAreaKey={onTextAreaKey}
          image={image}
          setImage={setImage}
          fileRef={fileRef}
          chooseRef={chooseRef}
          showImage={showImage}
          errors={errors}
          dismiss={dismiss}
        />
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
