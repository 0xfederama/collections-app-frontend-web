import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Button, useToast } from '../../components/ui'
import { useBreakpoint } from '../../lib/breakpoints'
import { releaseKeyboardProxy } from '../../lib/keyboardProxy'
import { ApiError, errorMessage, isDuplicateTitle, NetworkError } from '../../lib/api'
import { useCreateItem, type ItemType } from './api'
import { TitleLookupField } from './TitleLookupField'
import {
  createLookupSelection,
  isBookLookup,
  isLookupUnavailable,
  lookupSourceName,
  type LookupSelection,
  type LookupTitleSelection,
} from './lookup'
import { duplicateTitleMessage } from './duplicate'
import { LIMITS } from './form/draft'
import { LookupStatus } from './LookupStatus'
import { MessageBanner } from './inline/Banners'
import { useEditGuard } from './inline/guard'
import { EditorButtons } from './inline/controls'
import { useTypes, useSettings } from '../settings'
import { ListIconMark } from '../lists'
import { typeDefinition, typeName } from './types'

/**
 * The draft of a new item (F008-W9), shown by the item route at `/lists/:listId/items/new`.
 * Nothing exists on the server until the title is committed (Enter or ✓): that POSTs the item in
 * this list and replaces the URL with the real item page, where the other fields are edited in
 * place as usual. Esc, ✕, or leaving with an empty title drops the draft without a trace.
 * On phones (F-025 W13) the draft is a full page: after the commit it goes back to the list, and a
 * toast with an "Open" action opens the new item instead.
 */
export function NewItemDraft({
  listId,
  listName,
  type,
}: {
  listId: string
  listName: string
  type: ItemType
}) {
  const navigate = useNavigate()
  const { search } = useLocation()
  const phone = useBreakpoint() === 'mobile'
  const toast = useToast()
  const create = useCreateItem(listId)
  const settings = useSettings()
  const definitions = useTypes()
  const definition = typeDefinition(definitions.data, type)
  const guard = useEditGuard()
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string>()
  const [failure, setFailure] = useState<string>()
  const [lookupUnavailable, setLookupUnavailable] = useState(false)
  const [chosen, setChosen] = useState<LookupSelection>({})
  const sourceName = lookupSourceName(type)
  const box = useRef<HTMLDivElement>(null)

  // The title took focus on mount (autoFocus), so the iOS keyboard proxy opened by the tap that
  // created this draft is no longer needed (see `focusKeyboardProxy`).
  useEffect(() => {
    releaseKeyboardProxy()
  }, [])

  const changeTitle = (value: string) => {
    setTitle(value)
    setError(undefined)
    // Only a title that was typed can be lost: an empty draft never traps navigation.
    guard.setDirty('title', value.trim() !== '')
  }

  const leave = (to: string) => {
    guard.allowLeave()
    void navigate({ pathname: to, search }, { replace: true })
  }
  const cancel = () => leave(`/lists/${listId}`)

  const commit = async (lookup?: boolean, selection?: LookupTitleSelection) => {
    if (create.isPending) return
    const trimmed = (selection?.title ?? title).trim()
    setFailure(undefined)
    if (!trimmed) return setError('Enter a title.')
    if (trimmed.length > LIMITS.title) return setError(`Use at most ${LIMITS.title} characters.`)
    try {
      const created = await create.mutateAsync({
        title: trimmed,
        ...createLookupSelection(type, settings.data, selection ?? chosen),
        ...(lookup === undefined ? {} : { lookup }),
      })
      const itemPath = `/lists/${listId}/items/${created.id}`
      if (phone) {
        toast({
          kind: 'success',
          title: `Added “${created.title}”`,
          action: {
            label: 'Open',
            onAction: () => void navigate({ pathname: itemPath, search }),
          },
        })
        leave(`/lists/${listId}`)
      } else {
        leave(itemPath)
      }
    } catch (caught) {
      if (isLookupUnavailable(caught)) {
        setLookupUnavailable(true)
        setFailure(undefined)
      } else {
        setLookupUnavailable(false)
      }
      if (isDuplicateTitle(caught)) {
        // Inline under the title; the draft stays as typed.
        setError(duplicateTitleMessage(type))
      } else if (caught instanceof ApiError && caught.status === 422) {
        setError(caught.errors?.find((e) => e.field === 'title')?.message ?? caught.title)
      } else if (caught instanceof ApiError && caught.status === 409) {
        setFailure('This list no longer exists or is in Trash.')
      } else if (isLookupUnavailable(caught)) {
        // Keep the draft in place so the user can retry lookup or save the typed title alone.
      } else if (
        caught instanceof NetworkError ||
        (caught instanceof ApiError && caught.status >= 500)
      ) {
        setFailure('The server could not be reached. Nothing was added, so you can try again.')
      } else {
        setFailure(errorMessage(caught))
      }
    }
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      cancel()
    } else if (event.key === 'Enter' && (event.target as HTMLElement).tagName === 'INPUT') {
      event.preventDefault()
      void commit()
    }
  }

  // Focus leaving the editor with nothing typed removes the draft. A window switch (no target, the
  // document lost focus) does not.
  const onBlur = (event: FocusEvent) => {
    const next = event.relatedTarget as Node | null
    if (next && box.current?.contains(next)) return
    if (!next && !document.hasFocus()) return
    if (title.trim() === '' && !create.isPending) cancel()
  }

  return (
    <article aria-label="New item" className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <p className="flex items-center gap-1.5 font-mono text-label text-text-subtle uppercase">
          <ListIconMark
            icon={definition?.default_icon}
            type={type}
            className="size-5 bg-transparent"
            iconClassName="size-3.5"
          />
          {typeName(definition, type)} · New item
        </p>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Enter and Escape from the title field bubble here to the draft handlers; the title input is the focusable control */}
        <div
          ref={box}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          className="flex flex-wrap items-start gap-2"
        >
          <TitleLookupField
            type={type}
            title={title}
            onTitleChange={changeTitle}
            onSelectionChange={setChosen}
            onSuggestionSelect={(selection) => void commit(undefined, selection)}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- the new-item draft exists to type a title, so the title takes focus when it opens
            autoFocus
            placeholder="Title of the new item"
            error={error}
            // The field is as tall as the ✓ / ✕ buttons beside it (IconButton: size-11).
            className="min-w-0 flex-1 basis-40"
            inputClassName="h-11 w-full rounded-md border border-border bg-fill px-3 text-text outline-none placeholder:text-text-muted focus:border-accent"
          />
          <EditorButtons
            label="title"
            saveHint="Add item (Enter)"
            onSave={() => void commit()}
            onCancel={cancel}
            pending={create.isPending}
          />
        </div>
      </header>
      {create.isPending && isBookLookup(type, settings.data) && <LookupStatus />}
      {lookupUnavailable ? (
        <MessageBanner>
          {sourceName} metadata is unavailable right now. Your title is still here; retry the lookup
          or add it without {sourceName} metadata.
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void commit()}
              pending={create.isPending}
            >
              Retry {sourceName} lookup
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void commit(false)}
              pending={create.isPending}
            >
              Add without {sourceName} metadata
            </Button>
          </div>
        </MessageBanner>
      ) : (
        failure && <MessageBanner>{failure}</MessageBanner>
      )}
      <p className="text-ui text-text-muted">
        Press Enter to add it to {listName}, or Esc to discard it. The other fields and the
        description can be filled in once it is added.
      </p>
    </article>
  )
}
