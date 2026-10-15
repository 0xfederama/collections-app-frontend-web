import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useBlocker, useLocation, useNavigate, useSearchParams } from 'react-router'
import { AlertDialog, Button, Dialog, useToast } from '../../components/ui'
import { ApiError, NetworkError } from '../../lib/api'
import { useSettings } from '../settings/api'
import { itemKeys, useUpdateItem, type Item } from './api'
import { isEditing, withoutEdit } from './editMode'
import {
  buildPatch,
  draftDump,
  draftFromItem,
  firstInvalid,
  inputId,
  isDirty,
  mapServerErrors,
  validate,
  type Draft,
  type ErrorMap,
} from './form/draft'
import { BasicsFields, FormSection, KindFieldsSection, type FormState } from './form/FormFields'
import { ImageSection } from './image/ImageSection'
import { ContentSection } from './content/ContentEditor'
import { MoveItemDialog } from './ItemActions'

/** Why the last save did not go through, other than field errors. */
type Failure =
  { kind: 'conflict' } | { kind: 'gone' } | { kind: 'network' } | { kind: 'other'; message: string }

const bannerBase = 'flex flex-col gap-3 rounded-md border p-3 text-sm'

/**
 * The item edit form (UI_SPEC §4, §9). It edits a snapshot of the item taken when it opened: the
 * `If-Match` version comes from that snapshot, so a background refetch can never turn into a silent
 * overwrite of somebody else's change. Whatever goes wrong, the draft stays.
 */
export function ItemEditForm({ item, listName }: { item: Item; listName: string }) {
  const [base, setBase] = useState(item)
  const client = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const update = useUpdateItem()
  const settings = useSettings()
  const defaults = {
    country: settings.data?.streaming_country_code ?? '',
  }

  const [draft, setDraft] = useState<Draft>(() => draftFromItem(base))
  const [errors, setErrors] = useState<ErrorMap>({})
  const [otherErrors, setOtherErrors] = useState<string[]>([])
  const [failure, setFailure] = useState<Failure | null>(null)
  const [focusRequest, setFocusRequest] = useState<{ id: string; n: number } | null>(null)
  const [dialog, setDialog] = useState<'discard' | 'reload' | 'move' | null>(null)
  const [reloading, setReloading] = useState(false)
  const [reloadFailed, setReloadFailed] = useState(false)
  const [copyFallback, setCopyFallback] = useState<string | null>(null)
  const copyRef = useRef<HTMLTextAreaElement>(null)
  const alertsRef = useRef<HTMLDivElement>(null)

  const basicsDirty = isDirty(base, draft, defaults)
  // The description editor has its own draft and Save; it only reports whether it holds unsaved text.
  const [contentDirty, setContentDirty] = useState(false)
  const onContentDirty = useCallback((value: boolean) => setContentDirty(value), [])
  const dirty = basicsDirty || contentDirty

  // Leaving on purpose (cancel, discard, saved, reloaded) must not trigger the guard.
  const allowLeave = useRef(false)
  const leave = () => {
    allowLeave.current = true
    void navigate({ pathname, search: withoutEdit(searchParams) }, { replace: true })
  }

  // AT-22: block leaving the item (another list or item, the back button) with unsaved changes.
  // Staying on this item in edit mode (e.g. the list filter changing `?q=`) is fine.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!dirty || allowLeave.current) return false
    const staysHere =
      nextLocation.pathname === currentLocation.pathname &&
      isEditing(new URLSearchParams(nextLocation.search))
    return !staysHere
  })
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // The form is long and Save sits at the bottom: bring a new banner into view.
  useEffect(() => {
    if (failure || otherErrors.length > 0) alertsRef.current?.scrollIntoView({ block: 'center' })
  }, [failure, otherErrors])

  // Focus the first invalid input once the errors have been rendered.
  useEffect(() => {
    if (focusRequest) document.getElementById(focusRequest.id)?.focus()
  }, [focusRequest])
  const focusFirst = (found: ErrorMap, kind: Draft['kind']) => {
    const key = firstInvalid(found, kind)
    if (key) setFocusRequest((current) => ({ id: inputId(key), n: (current?.n ?? 0) + 1 }))
  }

  const clearError = (key: string) =>
    setErrors((current) => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  const form: FormState = {
    draft,
    errors,
    defaults,
    set: (key, value, errorKey) => {
      setDraft((current) => ({ ...current, [key]: value }))
      clearError(errorKey)
    },
    setMeta: (key, value) => {
      setDraft((current) => ({ ...current, meta: { ...current.meta, [key]: value } }))
      clearError(`metadata.${key}`)
    },
    clearError,
  }

  const save = async (event?: FormEvent) => {
    event?.preventDefault()
    setFailure(null)
    setOtherErrors([])
    const found = validate(draft, defaults)
    setErrors(found)
    if (Object.keys(found).length > 0) return focusFirst(found, draft.kind)
    try {
      const saved = await update.mutateAsync({
        item: base,
        patch: buildPatch(base, draft, defaults),
      })
      toast({ kind: 'success', title: 'Item saved', description: saved.title })
      if (contentDirty) {
        // Stay in edit mode: the description still has unsaved text. Rebase the Basics draft.
        setBase(saved)
        setDraft(draftFromItem(saved))
      } else leave()
    } catch (caught) {
      fail(caught)
    }
  }

  const fail = (caught: unknown) => {
    if (caught instanceof ApiError) {
      if (caught.status === 412) return setFailure({ kind: 'conflict' })
      if (caught.status === 404) return setFailure({ kind: 'gone' })
      if (caught.status === 422 && caught.errors?.length) {
        const mapped = mapServerErrors(caught.errors, draft.kind, draft.priceMode)
        setErrors(mapped.fields)
        setOtherErrors(mapped.other)
        return focusFirst(mapped.fields, draft.kind)
      }
      if (caught.status >= 500) return setFailure({ kind: 'network' })
      if (caught.code === 'unknown_field') {
        // The form sends only fields the spec declares, so this is a bug on our side.
        console.error('The API rejected an unknown field:', caught.detail ?? caught.title)
        return setFailure({
          kind: 'other',
          message: 'Something is wrong with this form, not with your input. Your changes are kept.',
        })
      }
      return setFailure({ kind: 'other', message: caught.detail ?? caught.title })
    }
    if (caught instanceof NetworkError) return setFailure({ kind: 'network' })
    setFailure({ kind: 'other', message: 'Something went wrong. Your changes are kept.' })
  }

  const copyDraft = async () => {
    const text = draftDump(base, draft, defaults)
    try {
      await navigator.clipboard.writeText(text)
      toast({ kind: 'success', title: 'Draft copied to the clipboard' })
    } catch {
      setCopyFallback(text)
    }
  }

  // "Reload latest": fetch the current version first; the draft is only dropped once that worked.
  const reloadLatest = async () => {
    setReloading(true)
    setReloadFailed(false)
    try {
      await client.refetchQueries(
        { queryKey: itemKeys.detail(base.id), exact: true },
        { throwOnError: true },
      )
      setDialog(null)
      leave()
    } catch {
      setDialog(null)
      setReloadFailed(true)
    } finally {
      setReloading(false)
    }
  }

  const cancel = () => (dirty ? setDialog('discard') : leave())

  return (
    <form onSubmit={(event) => void save(event)} noValidate className="flex flex-col gap-6">
      <h1 className="text-2xl leading-tight font-semibold break-words">Edit “{base.title}”</h1>

      <div ref={alertsRef} className="flex flex-col gap-6 empty:hidden">
        {failure?.kind === 'conflict' && (
          <div
            role="alert"
            className={`${bannerBase} border-warning-border bg-warning-bg text-warning-text`}
          >
            <p>
              Someone else changed this item while you were editing. Your changes have not been
              saved.
            </p>
            {reloadFailed && <p>The latest version could not be loaded. Try again.</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => void copyDraft()}>
                Copy my draft
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setDialog('reload')}>
                Reload latest
              </Button>
            </div>
          </div>
        )}
        {failure?.kind === 'gone' && (
          <div
            role="alert"
            className={`${bannerBase} border-danger-border bg-danger-bg text-danger-text`}
          >
            <p>
              This item was deleted or moved to Trash while you were editing. Your changes have not
              been saved.
            </p>
            <div>
              <Button size="sm" variant="secondary" onClick={() => void copyDraft()}>
                Copy my draft
              </Button>
            </div>
          </div>
        )}
        {failure?.kind === 'network' && (
          <div
            role="alert"
            className={`${bannerBase} border-danger-border bg-danger-bg text-danger-text`}
          >
            <p>
              The server could not be reached. Nothing was saved, and your changes are still here.
            </p>
            <div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void save()}
                pending={update.isPending}
              >
                Retry
              </Button>
            </div>
          </div>
        )}
        {failure?.kind === 'other' && (
          <div
            role="alert"
            className={`${bannerBase} border-danger-border bg-danger-bg text-danger-text`}
          >
            <p>{failure.message}</p>
          </div>
        )}
        {otherErrors.length > 0 && (
          <div
            role="alert"
            className={`${bannerBase} border-danger-border bg-danger-bg text-danger-text`}
          >
            <p>Some details need attention:</p>
            <ul className="list-disc pl-5">
              {otherErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <FormSection id="item-form-basics" title="Basics">
        <BasicsFields form={form} />
      </FormSection>

      <FormSection id="item-form-image" title="Image">
        <ImageSection
          item={base}
          // An image change is its own request and bumps the item's version: move the base
          // forward so the next save sends the new `If-Match`, and leave the draft alone.
          onChanged={(updated) =>
            setBase((current) => ({
              ...current,
              version: updated.version,
              image: updated.image,
              updated_at: updated.updated_at,
            }))
          }
          onStale={(kind) => setFailure({ kind })}
        />
      </FormSection>

      <KindFieldsSection form={form} />

      <FormSection id="item-form-description" title="Description">
        <ContentSection itemId={base.id} listId={base.list_id} onDirtyChange={onContentDirty} />
      </FormSection>

      <FormSection id="item-form-organization" title="Organization">
        <p className="text-sm">
          In <span className="font-medium">{listName}</span>
        </p>
        <div className="flex flex-col items-start gap-1.5">
          <Button variant="secondary" size="sm" disabled={dirty} onClick={() => setDialog('move')}>
            Move to another list
          </Button>
          {dirty && (
            <p className="text-xs text-text-muted">Save or discard your changes before moving.</p>
          )}
        </div>
      </FormSection>

      <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-border bg-bg py-3">
        <Button variant="secondary" onClick={cancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          pending={update.isPending}
          disabled={!basicsDirty || failure?.kind === 'conflict'}
        >
          Save changes
        </Button>
      </div>

      {(dialog === 'discard' || blocker.state === 'blocked') && (
        <AlertDialog
          open
          title="Discard changes?"
          description="You have unsaved changes to this item. If you leave now, they are lost."
          confirmLabel="Discard changes"
          cancelLabel="Keep editing"
          destructive
          keepOpen
          onOpenChange={(open) => {
            if (open) return
            if (blocker.state === 'blocked') blocker.reset()
            setDialog(null)
          }}
          onConfirm={() => {
            if (blocker.state === 'blocked') {
              allowLeave.current = true
              blocker.proceed()
            } else leave()
          }}
        />
      )}
      {dialog === 'reload' && (
        <AlertDialog
          open
          title="Replace your unsaved changes with the latest version?"
          description="Your draft is discarded. Use Copy my draft first if you want to keep it."
          confirmLabel="Reload latest"
          cancelLabel="Keep my draft"
          keepOpen
          pending={reloading}
          onOpenChange={(open) => !open && setDialog(null)}
          onConfirm={() => void reloadLatest()}
        />
      )}
      {dialog === 'move' && <MoveItemDialog item={base} onClose={() => setDialog(null)} />}
      {copyFallback !== null && (
        <Dialog
          open
          onOpenChange={(open) => !open && setCopyFallback(null)}
          title="Copy your draft"
          description="Your browser would not copy it for you. Select the text below and copy it."
          initialFocus={copyRef}
          footer={<Button onClick={() => setCopyFallback(null)}>Done</Button>}
        >
          <textarea
            ref={copyRef}
            readOnly
            aria-label="Your draft"
            rows={10}
            value={copyFallback}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-sm border border-border-strong bg-surface p-3 font-mono text-sm text-text"
          />
        </Dialog>
      )}
    </form>
  )
}
