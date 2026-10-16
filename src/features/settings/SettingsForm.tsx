import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useBlocker } from 'react-router'
import { AlertDialog, Button, Dialog, Select, TextField, useToast } from '../../components/ui'
import { CountrySelect } from '../../components/ui/IsoSelects'
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
  isFormDirty,
  isDirty,
  mapServerErrors,
  validate,
  type ErrorMap,
  type SettingsDraft,
  type SettingsField,
} from './form'

/** Why the last save did not go through, other than field errors. */
type Failure = { kind: 'conflict' | 'network' } | { kind: 'other'; message: string }

const bannerBase = 'flex flex-col gap-3 rounded-md border p-3 text-sm'

/**
 * The workspace settings form (UI_SPEC §8, §9). Like the item form it edits a snapshot taken when it
 * opened: `If-Match` comes from that snapshot, so a refetch in the background can never turn into a
 * silent overwrite. Whatever goes wrong, the draft stays.
 */
export function SettingsForm({ settings }: { settings: Settings }) {
  const client = useQueryClient()
  const toast = useToast()
  const update = useUpdateSettings()

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

  const dirty = isDirty(base, draft)
  const formDirty = isFormDirty(base, draft)

  // Block leaving the page with unsaved changes (router navigation and closing the tab).
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!dirty) return false
    return (
      currentLocation.pathname !== nextLocation.pathname ||
      currentLocation.search !== nextLocation.search
    )
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

  useEffect(() => {
    if (focusRequest) document.getElementById(focusRequest.id)?.focus()
  }, [focusRequest])
  const focusFirst = (found: ErrorMap) => {
    const field = firstInvalid(found)
    if (field) setFocusRequest((current) => ({ id: inputId(field), n: (current?.n ?? 0) + 1 }))
  }

  const set = (field: SettingsField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!(field in current)) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const fail = (caught: unknown) => {
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
  }

  const save = async (event?: FormEvent) => {
    retryAction.current = () => void save()
    event?.preventDefault()
    setFailure(null)
    setOtherErrors([])
    const found = validate(draft)
    setErrors(found)
    if (Object.keys(found).length > 0) return focusFirst(found)
    try {
      const saved = await update.mutateAsync({ base, patch: buildPatch(base, draft) })
      setBase(saved)
      setDraft(draftFromSettings(saved))
      toast({ kind: 'success', title: 'Settings saved' })
    } catch (caught) {
      fail(caught)
    }
  }

  const saveRetention = async (value: string) => {
    const days = value === 'off' ? null : Number(value)
    setDraft((current) => ({ ...current, trash_retention_days: value }))
    setFailure(null)
    setErrors({})
    setOtherErrors([])
    retryAction.current = () => void saveRetention(value)
    try {
      const saved = await update.mutateAsync({ base, patch: { trash_retention_days: days } })
      setBase(saved)
      setDraft((current) => ({ ...current, trash_retention_days: value }))
      toast({ kind: 'success', title: 'Trash retention saved' })
    } catch (caught) {
      fail(caught)
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
    <form onSubmit={(event) => void save(event)} noValidate className="flex flex-col gap-4">
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
        id={inputId('trash_retention_days')}
        label="Delete trash automatically"
        hint="Automatically and permanently delete trashed items after the selected number of days. This runs daily; it doesn’t empty the trash immediately."
        value={draft.trash_retention_days}
        onValueChange={(value) => void saveRetention(value)}
        disabled={update.isPending}
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

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          pending={update.isPending}
          disabled={!formDirty || failure?.kind === 'conflict'}
        >
          Save settings
        </Button>
      </div>

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
