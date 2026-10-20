import { useIsMutating, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ApiError, NetworkError } from '../../../lib/api'
import { cx } from '../../../lib/cx'
import { isOwnWriteChain, itemKeys, useUpdateItem, type Item } from '../api'
import { draftFromItem, type Draft } from '../form/draft'
import { draftDump } from '../form/dump'
import { buildPatch, isDirty } from '../form/patch'
import { mapServerErrors } from '../form/serverErrors'
import { inputId, validate, type ErrorMap } from '../form/validate'
import { FieldInputs, type FieldForm } from './editors'
import type { FieldSpec } from './fields'
import { useEditGuard } from './guard'
import { useSettings } from '../../settings'
import type { TypeDefinition } from '../types'
import { EditorButtons } from './controls'
import { FieldEditorBanner, type Failure } from './FieldEditorBanner'

const STACKED = ['price', 'years', 'metadata.streaming', 'metadata.stores']

export function FieldEditor({
  item: live,
  definition,
  spec,
  initialDraft,
  focusDelay,
  className,
  onDone,
}: {
  item: Item
  definition: TypeDefinition
  spec: FieldSpec
  initialDraft?: Partial<Draft>
  focusDelay: boolean
  className?: string
  onDone: () => void
}) {
  const client = useQueryClient()
  // A snapshot of the item taken when the editor opened: `If-Match` comes from it, never from a
  // refetch, so a change by someone else gives a 412 and keeps the draft ("no silent overwrite").
  // It moves forward only over versions that our own writes produced (e.g. another field saved
  // while this one is open).
  const [item, setItem] = useState(live)
  if (live.version !== item.version && isOwnWriteChain(client, live.id, item.version, live.version))
    setItem(live)
  const update = useUpdateItem()
  const guard = useEditGuard()
  const settings = useSettings()
  const defaults = { country: settings.data?.streaming_country_code ?? '' }
  // One write at a time: the next one needs the version the previous one returns.
  const busy = useIsMutating() > 0

  const [draft, setDraft] = useState<Draft>(() => ({
    ...draftFromItem(item, definition),
    ...initialDraft,
  }))
  const [errors, setErrors] = useState<ErrorMap>({})
  const [otherErrors, setOtherErrors] = useState<string[]>([])
  const [failure, setFailure] = useState<Failure | null>(null)
  const [reloading, setReloading] = useState(false)
  const [reloadFailed, setReloadFailed] = useState(false)
  const [focusRequest, setFocusRequest] = useState<{ id: string; n: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)

  // The draft of this field on top of the snapshot (only this field's inputs are copied).
  const merged = (source: Draft) => spec.take(draftFromItem(item, definition), source)
  const dirty = isDirty(item, merged(draft), defaults)
  useEffect(() => {
    guard.setDirty(spec.id, dirty)
    return () => guard.setDirty(spec.id, false)
  }, [dirty, guard, spec.id])

  // Focus the first input once opened; from the "+ Add field" menu after Radix gave focus back.
  useEffect(() => {
    const focus = () => {
      // Never steal focus from an input the user already moved to.
      if (box.current?.contains(document.activeElement)) return
      box.current
        ?.querySelector<HTMLElement>('input:not([type=checkbox]), button[role=combobox]')
        ?.focus()
    }
    if (!focusDelay) return focus()
    const timer = setTimeout(focus, 80)
    return () => clearTimeout(timer)
  }, [focusDelay])
  useEffect(() => {
    if (focusRequest) document.getElementById(focusRequest.id)?.focus()
  }, [focusRequest])

  const clearError = (key: string) =>
    setErrors((current) => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  const form: FieldForm = {
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
    commit: (change) => {
      const next = { ...draft, ...change }
      setDraft(next)
      void save(next)
    },
  }

  const showErrors = (found: ErrorMap) => {
    setErrors(found)
    const first = spec.errorKeys.find((key) => found[key])
    if (first) setFocusRequest((current) => ({ id: inputId(first), n: (current?.n ?? 0) + 1 }))
  }

  const save = async (source: Draft = draft) => {
    setFailure(null)
    setOtherErrors([])
    const next = merged(source)
    const all = validate(next, defaults)
    const found = Object.fromEntries(
      Object.entries(all).filter(([key]) => spec.errorKeys.includes(key)),
    )
    if (Object.keys(found).length > 0) return showErrors(found)
    const patch = buildPatch(item, next, defaults)
    if (Object.keys(patch).length === 0) return onDone()
    try {
      await update.mutateAsync({ item, patch })
      onDone()
    } catch (caught) {
      fail(caught, source)
    }
  }

  const fail = (caught: unknown, source: Draft) => {
    if (caught instanceof ApiError) {
      if (caught.status === 412) return setFailure({ kind: 'conflict' })
      if (caught.status === 404) return setFailure({ kind: 'gone' })
      if (caught.status === 422 && caught.errors?.length) {
        const mapped = mapServerErrors(caught.errors, definition.fields, source.priceMode)
        const own = Object.fromEntries(
          Object.entries(mapped.fields).filter(([key]) => spec.errorKeys.includes(key)),
        )
        const rest = Object.entries(mapped.fields)
          .filter(([key]) => !spec.errorKeys.includes(key))
          .map(([key, message]) => `${key}: ${message}`)
        setOtherErrors([...mapped.other, ...rest])
        return showErrors(own)
      }
      if (caught.status >= 500) return setFailure({ kind: 'network' })
      return setFailure({ kind: 'other', message: caught.detail ?? caught.title })
    }
    if (caught instanceof NetworkError) return setFailure({ kind: 'network' })
    setFailure({ kind: 'other', message: 'Something went wrong. Your changes are kept.' })
  }

  // The draft is dropped only once the latest version was fetched, and the user asked for it.
  const reloadLatest = async () => {
    setReloading(true)
    setReloadFailed(false)
    try {
      await client.refetchQueries(
        { queryKey: itemKeys.detail(item.id), exact: true },
        { throwOnError: true },
      )
      onDone()
    } catch {
      setReloadFailed(true)
    } finally {
      setReloading(false)
    }
  }

  const draftText = () => draftDump(item, merged(draft), defaults)

  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement
    // Keys from a popup (portal) or a combobox with its list open belong to that popup.
    if (event.defaultPrevented || !event.currentTarget.contains(target)) return
    if (event.key === 'Escape') {
      if (target.getAttribute('aria-expanded') === 'true') return
      event.preventDefault()
      event.stopPropagation()
      onDone()
    } else if (event.key === 'Enter' && target.matches('input:not([role=combobox])')) {
      if ((target as HTMLInputElement).type === 'checkbox') return
      event.preventDefault()
      void save()
    }
  }

  // Several inputs (years, streaming) would be crushed by the buttons beside them in the
  // narrow item panel: their ✓ and ✕ go below the inputs instead of at the end of one input.
  const stacked = STACKED.includes(spec.id)
  const buttons = (
    <EditorButtons
      label={spec.label.toLowerCase()}
      onSave={() => void save()}
      onCancel={onDone}
      pending={update.isPending}
      disabled={busy || failure?.kind === 'conflict' || failure?.kind === 'gone'}
    />
  )
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Enter and Escape from the inner editor inputs bubble to this wrapper; the wrapper is not a control
    <div ref={box} onKeyDown={onKeyDown} className={cx('flex flex-col gap-2', className)}>
      <div className={stacked ? 'flex flex-col gap-3' : 'flex flex-nowrap items-center gap-2'}>
        <div className={cx('min-w-0', !stacked && 'flex-1')}>
          <FieldInputs
            spec={spec}
            form={form}
            canRemovePrice={item.price !== null}
            priceActions={buttons}
          />
        </div>
        {spec.id !== 'price' && buttons}
      </div>
      <FieldEditorBanner
        failure={failure}
        otherErrors={otherErrors}
        draftText={draftText}
        onReload={() => void reloadLatest()}
        reloading={reloading}
        reloadFailed={reloadFailed}
        onRetry={() => void save()}
        pending={update.isPending}
      />
    </div>
  )
}
