/* eslint-disable max-lines -- one save/close/retention state machine; splitting it would only scatter shared refs (F020) */
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '../../components/ui'
import { useStoreProviders } from '../stores'
import { ApiError, NetworkError } from '../../lib/api'
import { settingsKeys, useUpdateSettings, type Settings } from './api'
import {
  buildPatch,
  classifySaveFailure,
  draftDump,
  draftFromSettings,
  firstInvalid,
  inputId,
  isDirty,
  isRetentionDirty,
  validate,
  type ErrorMap,
  type Failure,
  type SettingsDraft,
  type SettingsField,
} from './form'
import { useLeaveGuard } from './useLeaveGuard'

/**
 * The state machine behind the workspace settings form (UI_SPEC §8, §9): the save, close, retention
 * and reload flows over a snapshot taken when the form opened. Pure presentation stays in SettingsForm.
 */
type SettingsCloseRequest = (onClosed: () => void) => void
export type SettingsCloseRequestRef = { current: SettingsCloseRequest | null }

export function useSettingsForm({
  settings,
  closeRequestRef,
  onPaneChange,
}: {
  settings: Settings
  closeRequestRef: SettingsCloseRequestRef
  onPaneChange: (pane: string) => void
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
  const blocker = useLeaveGuard(dirty, allowLeave)

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
            field === 'preferred_store'
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
      const { failure: next, fields, other } = classifySaveFailure(caught)
      if (fields) {
        setErrors(fields)
        setOtherErrors(other ?? [])
        return focusFirst(fields)
      }
      if (next) setFailure(next)
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

  return {
    draft,
    errors,
    otherErrors,
    failure,
    dialog,
    setDialog,
    reloading,
    reloadFailed,
    copyFallback,
    setCopyFallback,
    copyRef,
    retryAction,
    blocker,
    isPending,
    set,
    saveRetention,
    copyDraft,
    reloadLatest,
    providers,
  }
}
