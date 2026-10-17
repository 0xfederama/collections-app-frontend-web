import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import {
  Button,
  Dialog,
  IconButton,
  Select,
  TextArea,
  TextField,
  useToast,
} from '../../components/ui'
import { ImagePlus, Plus, X } from '../../components/ui/icons'
import { ApiError, NetworkError } from '../../lib/api'
import { itemKeys, useCreateItem, type Item } from '../items/api'
import { createLookupSelection, TmdbTitleField } from '../items/TmdbTitleField'
import { MAX_CONTENT_BYTES, isTooLarge } from '../items/content/limits'
import { useSaveContent } from '../items/content/api'
import { LIMITS } from '../items/form/draft'
import { checkImageFile, ACCEPT } from '../items/image/checks'
import { putImageFile } from '../items/image/upload'
import { invalidateContent } from '../invalidateContent'
import { useTree } from '../tree/api'
import { useSettings } from '../settings/api'

type Field = 'title' | 'website' | 'description' | 'image' | 'list'

/** The lists of the tree, most recently updated first. */
function useListChoices() {
  const tree = useTree()
  const lists = [...(tree.data?.lists ?? [])].sort(
    (a, b) => b.updated_at.localeCompare(a.updated_at) || a.name.localeCompare(b.name),
  )
  return { lists, loading: tree.isPending }
}

const messageOf = (caught: unknown) =>
  caught instanceof ApiError ? (caught.detail ?? caught.title) : 'Something went wrong.'

/**
 * Quick add (F-002): a title, a destination list and, optionally, a website, a Markdown description
 * and an image. Enter adds, Esc cancels. The item is created first; the description and the image
 * are separate requests after it, so if one fails the item still opens and a toast says what.
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
  const toast = useToast()
  const queryClient = useQueryClient()
  const [pickedList, setPickedList] = useState<string>()
  const listId =
    pickedList ??
    (lists.some((l) => l.id === initialListId) ? initialListId : undefined) ??
    lists[0]?.id

  const [title, setTitle] = useState('')
  const [tmdbId, setTmdbId] = useState<number>()
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File>()
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [formError, setFormError] = useState<string>()
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

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (busy) return
    const trimmed = title.trim()
    const site = website.trim()
    const next: Partial<Record<Field, string>> = {}
    if (!trimmed) next.title = 'Enter a title.'
    else if (trimmed.length > LIMITS.title) next.title = `Use at most ${LIMITS.title} characters.`
    if (site.length > LIMITS.url) next.website = `Use at most ${LIMITS.url} characters.`
    if (isTooLarge(description)) next.description = 'The description is over 1 MiB.'
    if (image) {
      const problem = checkImageFile(image)
      if (problem) next.image = problem
    }
    if (!listId) next.list = 'Create a list first.'
    setErrors(next)
    setFormError(undefined)
    if (next.title) return titleRef.current?.focus()
    if (next.website) return websiteRef.current?.focus()
    if (next.description) return descriptionRef.current?.focus()
    if (next.image) return chooseRef.current?.focus()
    if (next.list || !listId) return

    setBusy(true)
    let created: Item
    try {
      const listKind = lists.find((list) => list.id === listId)?.kind ?? 'generic'
      created = await create.mutateAsync({
        title: trimmed,
        ...createLookupSelection(listKind, settings.data?.lookup_available === true, tmdbId),
        ...(site ? { website: site } : {}),
      })
    } catch (caught) {
      setBusy(false)
      if (caught instanceof ApiError && caught.status === 422) {
        const mapped: Partial<Record<Field, string>> = {}
        const rest: string[] = []
        for (const e of caught.errors ?? []) {
          if (e.field === 'title' || e.field === 'website') mapped[e.field] ??= e.message
          else rest.push(e.message)
        }
        setErrors(mapped)
        if (mapped.title) titleRef.current?.focus()
        else if (mapped.website) websiteRef.current?.focus()
        if (rest.length || (!mapped.title && !mapped.website)) {
          setFormError(rest.join(' ') || caught.title)
        }
      } else if (caught instanceof ApiError && caught.status === 409) {
        setFormError('This list no longer exists or is in Trash.')
      } else if (
        caught instanceof NetworkError ||
        (caught instanceof ApiError && caught.status >= 500)
      ) {
        setFormError('The server could not be reached. Nothing was created, so you can try again.')
      } else {
        setFormError(messageOf(caught))
      }
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
        failed.push(`the image (${messageOf(caught)})`)
      }
    }
    void invalidateContent(queryClient)
    if (failed.length) {
      toast({
        kind: 'error',
        title: `“${created.title}” was added, but ${failed.join(' and ')} could not be saved`,
        description: 'Open the item and edit it to add them again.',
      })
    } else {
      toast({ kind: 'success', title: `Added “${created.title}”` })
    }
    onClose()
    void navigate(`/lists/${listId}/items/${created.id}`)
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
          <TmdbTitleField
            kind={lists.find((list) => list.id === listId)?.kind ?? 'generic'}
            title={title}
            onTitleChange={(value) => {
              setTitle(value)
              dismiss('title')
            }}
            onSelectionChange={setTmdbId}
            inputRef={titleRef}
            error={errors.title}
            placeholder="Title"
            className="w-full"
            inputClassName="w-full border-b border-transparent bg-transparent pb-1 text-[22px] leading-snug font-semibold tracking-tight text-text outline-none placeholder:text-text-muted focus-visible:border-accent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-sm text-text-muted">
              In
            </span>
            <div className="w-40 [&>div>label]:sr-only [&_button]:h-8 [&_button]:rounded-md">
              <Select
                label="List"
                placeholder={loading ? 'Loading lists…' : 'Select a list'}
                options={lists.map((l) => ({ value: l.id, label: l.name }))}
                value={listId}
                onValueChange={(value) => {
                  setPickedList(value)
                  setTmdbId(undefined)
                }}
                error={errors.list}
              />
            </div>
          </div>
          {!showWebsite && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                reveal(
                  () => setShowWebsite(true),
                  () => websiteRef.current?.focus(),
                )
              }
            >
              <Plus aria-hidden className="size-4" />
              Website
            </Button>
          )}
          {!showDescription && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                reveal(
                  () => setShowDescription(true),
                  () => descriptionRef.current?.focus(),
                )
              }
            >
              <Plus aria-hidden className="size-4" />
              Description
            </Button>
          )}
          {!showImage && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                reveal(
                  () => setShowImage(true),
                  () => chooseRef.current?.focus(),
                )
              }
            >
              <Plus aria-hidden className="size-4" />
              Image
            </Button>
          )}
        </div>

        {showWebsite && (
          <div className="[&_label]:sr-only">
            <TextField
              ref={websiteRef}
              label="Website"
              inputMode="url"
              autoComplete="off"
              placeholder="https://"
              value={website}
              onChange={(event) => {
                setWebsite(event.target.value)
                dismiss('website')
              }}
              error={errors.website}
            />
          </div>
        )}
        {showDescription && (
          <div className="[&_label]:sr-only">
            <TextArea
              ref={descriptionRef}
              label="Description"
              hint="Markdown. Ctrl+Enter or Cmd+Enter adds."
              placeholder="Write in Markdown…"
              rows={3}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value)
                dismiss('description')
              }}
              onKeyDown={onTextAreaKey}
              error={errors.description}
              maxLength={MAX_CONTENT_BYTES}
            />
          </div>
        )}
        {showImage && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                tabIndex={-1}
                aria-hidden
                className="sr-only"
                onChange={(event) => {
                  setImage(event.target.files?.[0])
                  dismiss('image')
                }}
              />
              <Button
                ref={chooseRef}
                variant="secondary"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus aria-hidden className="size-4" />
                {image ? 'Change image' : 'Choose image'}
              </Button>
              {image && (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm text-text-muted">
                    {image.name}
                  </span>
                  <IconButton
                    aria-label="Remove image"
                    className="size-8 pointer-coarse:size-11"
                    onClick={() => {
                      setImage(undefined)
                      if (fileRef.current) fileRef.current.value = ''
                    }}
                  >
                    <X aria-hidden />
                  </IconButton>
                </>
              )}
            </div>
            {errors.image && (
              <p role="alert" className="text-xs font-medium text-danger-text">
                {errors.image}
              </p>
            )}
          </div>
        )}
        {formError && (
          <div
            role="alert"
            className="rounded-md border border-danger-border bg-danger-bg p-3 text-sm text-danger-text"
          >
            {formError}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-xs text-text-muted max-sm:hidden [@media(hover:none)]:hidden">
            Enter to add · Esc to cancel
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" pending={busy}>
              Add
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
