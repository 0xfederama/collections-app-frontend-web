import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useBlocker } from 'react-router'
import { AlertDialog, Button, Dialog, Select, TextField, useToast } from '../../components/ui'
import { CountrySelect } from '../../components/ui/IsoSelects'
import { StoreChoices } from '../stores/StoreChoices'
import { useStoreProviders } from '../stores/api'
import { joinStoreKeys, parseStoreKeys } from '../stores/providers'
import { ApiError, NetworkError } from '../../lib/api'
import { settingsKeys, useUpdateSettings, type Settings } from './api'
import {
  HISTORY_LIMIT_MAX,
  NAME_MAX,
  buildPatch,
  draftDump,
  draftFromSettings,
  firstInvalid,
  inputId,
  isDirty,
  isRetentionDirty,
  mapServerErrors,
  validate,
  type ErrorMap,
  type SettingsDraft,
  type SettingsField,
} from './form'

/** Why the last save did not go through, other than field errors. */
type Failure = { kind: 'conflict' | 'network' } | { kind: 'other'; message: string }

const bannerBase = 'flex flex-col gap-3 rounded-md border p-3 text-sm'

const metadataLanguageOptions = [
  { value: 'en-US', label: 'English (United States)' },
  { value: 'it-IT', label: 'Italiano (Italia)' },
  { value: 'fr-FR', label: 'Français (France)' },
  { value: 'de-DE', label: 'Deutsch (Deutschland)' },
  { value: 'es-ES', label: 'Español (España)' },
]

/**
 * The workspace settings form (UI_SPEC §8, §9). Like the item form it edits a snapshot taken when it
 * opened: `If-Match` comes from that snapshot, so a refetch in the background can never turn into a
 * silent overwrite. Whatever goes wrong, the draft stays.
 */
export type SettingsCloseRequest = (onClosed: () => void) => void
export type SettingsCloseRequestRef = { current: SettingsCloseRequest | null }

export function SettingsForm({
  settings,
  closeRequestRef,
  pane,
  onPaneChange,
  appearance,
}: {
  settings: Settings
  closeRequestRef: SettingsCloseRequestRef
  pane: string
  onPaneChange: (pane: string) => void
  /** The per-device theme choice, shown at the end of the General pane. */
  appearance?: ReactNode
}) {
  const client = useQueryClient()
  const toast = useToast()
  const { isPending, mutateAsync } = useUpdateSettings()
  const providers = useStoreProviders()

  const [base, setBase] = useState(settings)
  const [draft, setDraft] = useState<SettingsDraft>(() => draftFromSettings(settings))
  const [errors, setErrors] = useState<ErrorMap>({})
  const [otherErrors, setOtherErrors] = useState<string[]>([])
  const [failure, setFailure] = useState<Failure | null>(null)
  const [dialog, setDialog] = useState<'reload' | null>(null)
  const [reloading, setReloading] = useState(false)
  const [reloadFailed, setReloadFailed] = useState(false)
  const [copyFallback, setCopyFallback] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<{ id: string; n: number } | null>(null)
  const copyRef = useRef<HTMLTextAreaElement>(null)
  const retryAction = useRef<() => void>(() => undefined)
  const saveRef = useRef<() => Promise<void>>(async () => undefined)
  const closeAfterSave = useRef<(() => void) | null>(null)
  const allowLeave = useRef(false)
  const retentionSaveInFlight = useRef(false)
  const retentionSaveSucceeded = useRef(false)

  const dirty = isDirty(base, draft)
  const retentionDirty = isRetentionDirty(base, draft)

  // Block leaving the page with unsaved changes (router navigation and closing the tab).
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (allowLeave.current) return false
    if (!dirty) return false
    return (
      currentLocation.pathname !== nextLocation.pathname ||
      currentLocation.search !== nextLocation.search
    )
  })
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      if (allowLeave.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    if (focusRequest) document.getElementById(focusRequest.id)?.focus()
  }, [focusRequest])
  const focusFirst = useCallback(
    (found: ErrorMap) => {
      const field = firstInvalid(found)
      if (field) {
        onPaneChange(
          field === 'streaming_country_code' ||
            field === 'metadata_language' ||
            field === 'preferred_stores'
            ? 'Media'
            : 'General',
        )
        setFocusRequest((current) => ({ id: inputId(field), n: (current?.n ?? 0) + 1 }))
      }
    },
    [onPaneChange],
  )

  const set = (field: SettingsField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!(field in current)) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const fail = useCallback(
    (caught: unknown) => {
      if (caught instanceof ApiError) {
        if (caught.status === 412) return setFailure({ kind: 'conflict' })
        if (caught.status === 422 && caught.errors?.length) {
          const mapped = mapServerErrors(caught.errors)
          setErrors(mapped.fields)
          setOtherErrors(mapped.other)
          return focusFirst(mapped.fields)
        }
        if (caught.status >= 500) return setFailure({ kind: 'network' })
        return setFailure({ kind: 'other', message: caught.detail ?? caught.title })
      }
      if (caught instanceof NetworkError) return setFailure({ kind: 'network' })
      setFailure({ kind: 'other', message: 'Something went wrong. Your changes are kept.' })
    },
    [focusFirst],
  )

  const save = useCallback(async () => {
    if (retentionDirty) return
    retryAction.current = () => void saveRef.current()
    setFailure(null)
    setOtherErrors([])
    const found = validate(draft)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      closeAfterSave.current = null
      return focusFirst(found)
    }
    try {
      const saved = await mutateAsync({ base, patch: buildPatch(base, draft) })
      setBase(saved)
      setDraft(draftFromSettings(saved))
      toast({ kind: 'success', title: 'Settings saved' })
      const onClosed = closeAfterSave.current
      if (onClosed) {
        closeAfterSave.current = null
        allowLeave.current = true
        onClosed()
      }
    } catch (caught) {
      fail(caught)
      if (
        !(caught instanceof NetworkError) &&
        !(caught instanceof ApiError && caught.status >= 500)
      ) {
        closeAfterSave.current = null
      }
    }
  }, [base, draft, fail, focusFirst, mutateAsync, retentionDirty, toast])

  useEffect(() => {
    saveRef.current = save
  }, [save])

  useEffect(() => {
    const requestClose: SettingsCloseRequest = (onClosed) => {
      if (!dirty) {
        allowLeave.current = true
        onClosed()
        return
      }
      if (retentionDirty) {
        if (retentionSaveInFlight.current || retentionSaveSucceeded.current) {
          closeAfterSave.current = onClosed
        }
        return
      }
      closeAfterSave.current = onClosed
      void save()
    }
    closeRequestRef.current = requestClose
    return () => {
      if (closeRequestRef.current === requestClose) closeRequestRef.current = null
    }
  }, [closeRequestRef, dirty, retentionDirty, save])

  useEffect(() => {
    if (
      !closeAfterSave.current ||
      !retentionSaveSucceeded.current ||
      retentionSaveInFlight.current ||
      isPending ||
      retentionDirty
    ) {
      return
    }

    retentionSaveSucceeded.current = false
    if (dirty) {
      void Promise.resolve().then(save)
      return
    }

    const onClosed = closeAfterSave.current
    closeAfterSave.current = null
    allowLeave.current = true
    onClosed?.()
  }, [dirty, isPending, retentionDirty, save])

  const saveRetention = async (value: string) => {
    const days = value === 'off' ? null : Number(value)
    setDraft((current) => ({ ...current, trash_retention_days: value }))
    setFailure(null)
    setErrors({})
    setOtherErrors([])
    retryAction.current = () => void saveRetention(value)
    retentionSaveSucceeded.current = false
    retentionSaveInFlight.current = true
    try {
      const saved = await mutateAsync({ base, patch: { trash_retention_days: days } })
      setBase(saved)
      setDraft((current) => ({ ...current, trash_retention_days: value }))
      toast({ kind: 'success', title: 'Trash retention saved' })
      retentionSaveSucceeded.current = true
    } catch (caught) {
      fail(caught)
      if (
        !(caught instanceof NetworkError) &&
        !(caught instanceof ApiError && caught.status >= 500)
      ) {
        closeAfterSave.current = null
      }
    } finally {
      retentionSaveInFlight.current = false
    }
  }

  const copyDraft = async () => {
    const text = draftDump(base, draft)
    try {
      await navigator.clipboard.writeText(text)
      toast({ kind: 'success', title: 'Draft copied to the clipboard' })
    } catch {
      setCopyFallback(text)
    }
  }

  // "Reload latest": fetch the current settings first; the draft is only dropped once that worked.
  const reloadLatest = async () => {
    setReloading(true)
    setReloadFailed(false)
    try {
      await client.refetchQueries(
        { queryKey: settingsKeys.settings, exact: true },
        { throwOnError: true },
      )
      const latest = client.getQueryData<Settings>(settingsKeys.settings)
      if (!latest) throw new Error('settings missing after refetch')
      setBase(latest)
      setDraft(draftFromSettings(latest))
      setErrors({})
      setOtherErrors([])
      setFailure(null)
      setDialog(null)
    } catch {
      setDialog(null)
      setReloadFailed(true)
    } finally {
      setReloading(false)
    }
  }

  return (
    <form onSubmit={(event) => event.preventDefault()} noValidate className="flex flex-col gap-4">
      <div role="group" aria-label="Messages" className="flex flex-col gap-4 empty:hidden">
        {failure?.kind === 'conflict' && (
          <div
            role="alert"
            className={`${bannerBase} border-warning-border bg-warning-bg text-warning-text`}
          >
            <p>
              Someone else changed the settings while you were editing. Your changes have not been
              saved.
            </p>
            {reloadFailed && <p>The latest settings could not be loaded. Try again.</p>}
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
                onClick={() => retryAction.current()}
                pending={isPending}
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

      <section
        aria-labelledby="settings-general"
        hidden={pane !== 'General'}
        className={`flex flex-col gap-4 ${pane !== 'General' ? 'hidden' : ''}`}
      >
        <h2 id="settings-general" className="text-sm font-semibold text-text-muted">
          General
        </h2>
        <TextField
          id={inputId('workspace_name')}
          label="Workspace name"
          required
          autoComplete="off"
          maxLength={NAME_MAX + 50}
          value={draft.workspace_name}
          onChange={(event) => set('workspace_name', event.target.value)}
          error={errors.workspace_name}
        />
        <Select
          id={inputId('trash_retention_days')}
          label="Delete trash automatically"
          hint="Automatically and permanently delete trashed items after the selected number of days. This runs daily; it doesn’t empty the trash immediately."
          value={draft.trash_retention_days}
          onValueChange={(value) => void saveRetention(value)}
          error={errors.trash_retention_days}
          disabled={isPending}
          options={[
            { value: 'off', label: 'Off' },
            { value: '7', label: '7 days' },
            { value: '30', label: '30 days' },
            { value: '90', label: '90 days' },
            ...(!['off', '7', '30', '90'].includes(draft.trash_retention_days)
              ? [
                  {
                    value: draft.trash_retention_days,
                    label: `Current: ${draft.trash_retention_days} days`,
                  },
                ]
              : []),
          ]}
        />
        <TextField
          id={inputId('markdown_history_limit')}
          label="Description history limit"
          inputMode="numeric"
          autoComplete="off"
          hint={`How many earlier versions of an item's description to keep, 0 to ${HISTORY_LIMIT_MAX}. Lowering it removes the extra versions the next time each description is saved.`}
          value={draft.markdown_history_limit}
          onChange={(event) => set('markdown_history_limit', event.target.value)}
          error={errors.markdown_history_limit}
        />
        {appearance}
      </section>

      <section
        aria-labelledby="settings-movies-tv"
        hidden={pane !== 'Media'}
        className={`flex flex-col gap-4 ${pane !== 'Media' ? 'hidden' : ''}`}
      >
        <h2 id="settings-movies-tv" className="text-sm font-semibold text-text-muted">
          Movies &amp; TV
        </h2>
        <CountrySelect
          id={inputId('streaming_country_code')}
          label="Streaming country"
          hint="Streaming platforms on a movie or TV show are for this country unless you pick another."
          placeholder="Country"
          value={draft.streaming_country_code}
          onValueChange={(value) => set('streaming_country_code', value)}
          error={errors.streaming_country_code}
        />
        <Select
          id={inputId('metadata_language')}
          label="Metadata language"
          hint="Titles and other details filled from online sources use this language."
          value={draft.metadata_language}
          onValueChange={(value) => set('metadata_language', value)}
          error={errors.metadata_language}
          disabled={isPending}
          options={metadataLanguageOptions}
        />
        <h2 id="settings-books" className="pt-2 text-sm font-semibold text-text-muted">
          Books
        </h2>
        <StoreChoices
          label="Where to get it"
          hint="New books start with these stores, in the order you pick them. Each store is a link that searches for the book there, built from its ISBN or title. Each book can change its own list."
          value={parseStoreKeys(draft.preferred_stores)}
          onChange={(next) => set('preferred_stores', joinStoreKeys(next))}
          providers={providers.data}
          error={errors.preferred_stores}
        />
      </section>

      {blocker.state === 'blocked' && (
        <AlertDialog
          open
          title="Discard changes?"
          description="You have unsaved settings. If you leave now, they are lost."
          confirmLabel="Discard changes"
          cancelLabel="Keep editing"
          destructive
          keepOpen
          onOpenChange={(open) => !open && blocker.reset()}
          onConfirm={() => blocker.proceed()}
        />
      )}
      {dialog === 'reload' && (
        <AlertDialog
          open
          title="Replace your unsaved changes with the latest settings?"
          description="Your draft is discarded. Use Copy my draft first if you want to keep it."
          confirmLabel="Reload latest"
          cancelLabel="Keep my draft"
          keepOpen
          pending={reloading}
          onOpenChange={(open) => !open && setDialog(null)}
          onConfirm={() => void reloadLatest()}
        />
      )}
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
            rows={6}
            value={copyFallback}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-sm border border-border-strong bg-surface p-3 font-mono text-sm text-text"
          />
        </Dialog>
      )}
    </form>
  )
}
