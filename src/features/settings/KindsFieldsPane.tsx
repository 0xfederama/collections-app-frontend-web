import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { AlertDialog, Button, Select, Skeleton, TextField } from '../../components/ui'
import { SortableProvider, useSortableRow } from '../../components/ui/sortable'
import { ApiError, NetworkError } from '../../lib/api'
import { cx } from '../../lib/cx'
import { ListIconMark } from '../lists/ListIconMark'
import { ListIconPicker } from '../lists/ListIconPicker'
import type { IconChoice } from '../lists/iconModel'
import { useUpdateList } from '../tree/mutations'
import { treeKeys, useTree } from '../tree/api'
import {
  kindKeys,
  useCreateKind,
  useCreateKindField,
  useDeleteKind,
  useDeleteKindField,
  useKinds,
  usePreviewKindFieldDelete,
  useRenameKindField,
  useReorderKindFields,
  useUpdateKind,
  type KindDefinition,
  type KindField,
  type UpdateKindRequest,
} from './api'

const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes / no' },
  { value: 'link', label: 'Link' },
] as const

const NONE_FIELD = '__none__'

interface KindDefaultsDraft {
  kindKey: string
  icon: string | null
  allowsPrice: boolean
  sortField: string | null
  pinnedFields: string[] | null
}

const defaultsFromKind = (kind: KindDefinition): KindDefaultsDraft => ({
  kindKey: kind.key,
  icon: kind.default_icon ?? null,
  allowsPrice: kind.allows_price,
  sortField: kind.default_sort_field ?? null,
  pinnedFields: kind.default_pinned_fields ?? null,
})

function sameNullableList(left: string[] | null, right: string[] | null) {
  if (left === null || right === null) return left === right
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function errorText(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 412)
      return 'This definition changed while you were editing. Reload the latest version and try again.'
    if (error.errors?.length) return error.errors.map((entry) => entry.message).join(' ')
    return error.detail ?? error.title
  }
  if (error instanceof NetworkError)
    return 'Could not reach the server. Your changes are still here; try again.'
  return 'Something went wrong. Your changes are still here; try again.'
}

function KindRow({
  kind,
  selected,
  onSelect,
}: {
  kind: KindDefinition
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-current={selected ? 'true' : undefined}
      onClick={onSelect}
      className={cx(
        'flex min-h-12 w-full items-center gap-3 rounded-md px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-focus-ring',
        selected ? 'bg-accent/10 text-text' : 'hover:bg-fill',
      )}
    >
      <ListIconMark
        icon={kind.default_icon}
        kind="generic"
        className="size-9"
        iconClassName="size-4"
      />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{kind.name}</span>
      {kind.is_locked && (
        <span className="shrink-0 rounded-full bg-fill px-2 py-1 text-xs text-text-muted">
          Built in · locked
        </span>
      )}
    </button>
  )
}

function SortableField({
  field,
  index,
  size,
  onRename,
  onDelete,
}: {
  field: KindField
  index: number
  size: number
  onRename: () => void
  onDelete: () => void
}) {
  const { ref, isDragging, a11y } = useSortableRow(
    field.key,
    field.is_locked ? undefined : { group: 'kind-fields', index, size, label: field.label },
  )
  return (
    <div
      ref={ref}
      role="listitem"
      tabIndex={field.is_locked ? undefined : 0}
      aria-label={`${field.label}, ${field.type === 'boolean' ? 'yes or no' : field.type}`}
      aria-describedby={a11y['aria-describedby']}
      className={cx(
        'flex min-h-14 items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 focus-visible:outline-2 focus-visible:outline-focus-ring',
        isDragging && 'opacity-50',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{field.label}</span>
        <span className="text-xs text-text-muted">
          {field.key} · {field.type === 'boolean' ? 'yes / no' : field.type}
          {field.is_locked ? ' · built in, read only' : ''}
        </span>
      </span>
      {!field.is_locked && (
        <>
          <Button variant="ghost" size="sm" onClick={onRename} aria-label={`Rename ${field.label}`}>
            Rename
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label={`Delete ${field.label}`}>
            Delete
          </Button>
        </>
      )}
      {field.is_locked && <span className="text-xs text-text-muted">Locked</span>}
    </div>
  )
}

export function KindsFieldsPane() {
  const queryClient = useQueryClient()
  const kindsQuery = useKinds()
  const treeQuery = useTree()
  const createKind = useCreateKind()
  const updateKind = useUpdateKind()
  const deleteKind = useDeleteKind()
  const updateList = useUpdateList()
  const createField = useCreateKindField()
  const renameField = useRenameKindField()
  const deleteField = useDeleteKindField()
  const previewDelete = usePreviewKindFieldDelete()
  const reorderFields = useReorderKindFields()
  const kinds = useMemo(() => kindsQuery.data ?? [], [kindsQuery.data])
  const [pickedKey, setSelectedKey] = useState<string | null>(null)
  // Until the user picks one (or after the picked kind is gone), the first kind is selected.
  const selected = kinds.find((kind) => kind.key === pickedKey) ?? kinds[0] ?? null
  const selectedKey = selected?.key ?? null
  const [defaultsDraft, setDefaults] = useState<KindDefaultsDraft | null>(null)
  const defaults =
    defaultsDraft && defaultsDraft.kindKey === selectedKey
      ? defaultsDraft
      : selected
        ? defaultsFromKind(selected)
        : null
  const [renameDraft, setRenameDraft] = useState<{ key: string; name: string } | null>(null)
  const renameName =
    renameDraft && renameDraft.key === selectedKey ? renameDraft.name : (selected?.name ?? '')
  const setRenameName = (value: string) => {
    if (selectedKey) setRenameDraft({ key: selectedKey, name: value })
  }
  const [name, setName] = useState('')
  const [fieldLabel, setFieldLabel] = useState('')
  const [fieldType, setFieldType] = useState<(typeof fieldTypes)[number]['value']>('text')
  const [allowsPrice, setAllowsPrice] = useState(false)
  const [icon, setIcon] = useState<IconChoice>({ icon: null, icon_color: null })
  const [iconOpen, setIconOpen] = useState(false)
  const [iconTarget, setIconTarget] = useState<'create' | 'kind'>('create')
  const [editingField, setEditingField] = useState<KindField | null>(null)
  const [fieldDraft, setFieldDraft] = useState('')
  const [confirmDeleteKind, setConfirmDeleteKind] = useState<KindDefinition | null>(null)
  const [confirmChangeLists, setConfirmChangeLists] = useState<KindDefinition | null>(null)
  const [changeTargetKind, setChangeTargetKind] = useState('')
  const [confirmDeleteField, setConfirmDeleteField] = useState<{
    kind: KindDefinition
    field: KindField
    count: number
  } | null>(null)
  const [operationError, setOperationError] = useState<unknown>(null)
  const [conflict, setConflict] = useState(false)
  const customFields = selected?.fields.filter((field) => !field.is_locked) ?? []
  const affectedLists =
    confirmDeleteKind && treeQuery.data
      ? treeQuery.data.lists.filter((list) => list.kind === confirmDeleteKind.key)
      : []
  const targetKinds = kinds.filter((kind) => kind.key !== confirmDeleteKind?.key)
  const defaultFieldOptions = selected
    ? [
        ...selected.fields.map((field) => ({ value: field.key, label: field.label })),
        ...(defaults?.allowsPrice ? [{ value: 'price', label: 'Price' }] : []),
      ]
    : []
  const defaultsDirty =
    !!selected &&
    !!defaults &&
    !selected.is_locked &&
    (defaults.icon !== (selected.default_icon ?? null) ||
      defaults.allowsPrice !== selected.allows_price ||
      defaults.sortField !== (selected.default_sort_field ?? null) ||
      !sameNullableList(defaults.pinnedFields, selected.default_pinned_fields ?? null))

  const run = async (operation: () => Promise<unknown>) => {
    setOperationError(null)
    setConflict(false)
    try {
      await operation()
    } catch (error) {
      setOperationError(error)
      if (error instanceof ApiError && error.status === 412) setConflict(true)
    }
  }

  const reloadLatest = async () => {
    try {
      await queryClient.refetchQueries({ queryKey: kindKeys.kinds }, { throwOnError: true })
      const latest = queryClient.getQueryData<KindDefinition[]>(kindKeys.kinds)
      const latestSelected = latest?.find((kind) => kind.key === selectedKey)
      if (latestSelected) {
        setDefaults(defaultsFromKind(latestSelected))
        setRenameName(latestSelected.name)
      }
      setOperationError(null)
      setConflict(false)
    } catch {
      setOperationError(new Error('The latest definition could not be loaded. Try again.'))
    }
  }

  const submitKind = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const created = await createKind
      .mutateAsync({
        name: trimmed,
        ...(icon.icon ? { default_icon: icon.icon } : {}),
        allows_price: allowsPrice,
      })
      .catch((error: unknown) => {
        setOperationError(error)
        return null
      })
    if (created) {
      setName('')
      setIcon({ icon: null, icon_color: null })
      setAllowsPrice(false)
      setSelectedKey((created as KindDefinition).key)
      setOperationError(null)
    }
  }

  const saveKindDefaults = async () => {
    if (!selected || !defaults || selected.is_locked) return
    const patch: UpdateKindRequest = {}
    if (defaults.icon !== (selected.default_icon ?? null)) patch.default_icon = defaults.icon
    if (defaults.allowsPrice !== selected.allows_price) patch.allows_price = defaults.allowsPrice
    if (defaults.sortField !== (selected.default_sort_field ?? null))
      patch.default_sort_field = defaults.sortField
    if (!sameNullableList(defaults.pinnedFields, selected.default_pinned_fields ?? null))
      patch.default_pinned_fields = defaults.pinnedFields
    if (Object.keys(patch).length === 0) return

    try {
      setOperationError(null)
      setConflict(false)
      const updated = await updateKind.mutateAsync({ kind: selected, patch })
      setDefaults(defaultsFromKind(updated))
    } catch (error) {
      setOperationError(error)
      if (error instanceof ApiError && error.status === 412) setConflict(true)
    }
  }

  if (kindsQuery.isPending)
    return (
      <div role="status" className="flex flex-col gap-3">
        <span className="sr-only">Loading kinds</span>
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    )
  if (kindsQuery.isError)
    return (
      <div role="alert" className="flex flex-col items-start gap-2 text-sm">
        <p>Couldn’t load kinds and fields.</p>
        <Button variant="secondary" onClick={() => void kindsQuery.refetch()}>
          Retry
        </Button>
      </div>
    )

  return (
    <div className="flex max-h-[65vh] min-h-0 flex-col gap-4 overflow-y-auto sm:flex-row">
      <div className="flex min-w-0 flex-col gap-2 sm:w-56 sm:shrink-0">
        <div className="flex flex-col gap-1" role="list" aria-label="Kinds">
          {kinds.map((kind) => (
            <div role="listitem" key={kind.key}>
              <KindRow
                kind={kind}
                selected={selected?.key === kind.key}
                onSelect={() => {
                  setSelectedKey(kind.key)
                  setOperationError(null)
                }}
              />
            </div>
          ))}
        </div>
        <form
          onSubmit={(event) => void submitKind(event)}
          className="mt-2 flex flex-col gap-2 rounded-md border border-border p-3"
        >
          <h3 className="text-sm font-semibold">Create a kind</h3>
          <TextField
            label="Kind name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
          />
          <label className="flex min-h-10 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={allowsPrice}
              onChange={(event) => setAllowsPrice(event.target.checked)}
            />{' '}
            Allows a price
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIconTarget('create')
                setIconOpen(true)
              }}
            >
              {icon.icon ? (
                <>
                  <ListIconMark icon={icon.icon} className="size-5" iconClassName="size-3" />
                  Change icon
                </>
              ) : (
                'Choose icon'
              )}
            </Button>
            <Button type="submit" size="sm" pending={createKind.isPending} disabled={!name.trim()}>
              Create kind
            </Button>
          </div>
          <p className="text-xs leading-5 text-text-muted">
            Create the kind first, then add its fields and set the default sort and pins in its
            details.
          </p>
        </form>
      </div>
      <div className="min-w-0 flex-1 rounded-lg bg-surface p-4 shadow-md sm:p-5">
        {selected ? (
          <>
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold">{selected.name}</h3>
                <p className="text-xs text-text-muted">
                  {selected.is_locked
                    ? 'Built in kind · settings are read only'
                    : `Key: ${selected.key}`}
                </p>
              </div>
              {!selected.is_locked && (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={treeQuery.isPending || treeQuery.isError}
                  onClick={() => {
                    setChangeTargetKind(kinds.find((kind) => kind.key !== selected.key)?.key ?? '')
                    setConfirmDeleteKind(selected)
                  }}
                >
                  Delete kind
                </Button>
              )}
            </div>
            {!selected.is_locked && defaults?.kindKey === selected.key && (
              <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-40 flex-1">
                    <TextField
                      label="Rename kind"
                      value={renameName}
                      onChange={(event) => setRenameName(event.target.value)}
                      maxLength={100}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!renameName.trim() || renameName.trim() === selected.name}
                    pending={updateKind.isPending}
                    onClick={() =>
                      void run(async () => {
                        const updated = await updateKind.mutateAsync({
                          kind: selected,
                          patch: { name: renameName.trim() },
                        })
                        setRenameName(updated.name)
                        setDefaults(defaultsFromKind(updated))
                      })
                    }
                  >
                    Save name
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ListIconMark icon={defaults.icon} className="size-9" iconClassName="size-4" />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIconTarget('kind')
                      setIconOpen(true)
                    }}
                  >
                    {defaults.icon ? 'Change icon' : 'Choose icon'}
                  </Button>
                  {defaults.icon && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Clear kind icon"
                      onClick={() => setDefaults({ ...defaults, icon: null })}
                    >
                      Clear icon
                    </Button>
                  )}
                  <label className="ml-1 flex min-h-10 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      aria-label="Allow prices for items"
                      checked={defaults.allowsPrice}
                      onChange={(event) => {
                        const allows = event.target.checked
                        setDefaults({
                          ...defaults,
                          allowsPrice: allows,
                          sortField:
                            allows || defaults.sortField !== 'price' ? defaults.sortField : null,
                          pinnedFields:
                            allows || defaults.pinnedFields === null
                              ? defaults.pinnedFields
                              : defaults.pinnedFields.filter((field) => field !== 'price'),
                        })
                      }}
                    />
                    Allows a price
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Default sort field"
                    options={[{ value: NONE_FIELD, label: 'None' }, ...defaultFieldOptions]}
                    value={defaults.sortField ?? NONE_FIELD}
                    onValueChange={(value) =>
                      setDefaults({
                        ...defaults,
                        sortField: value === NONE_FIELD ? null : value,
                      })
                    }
                    disabled={defaultFieldOptions.length === 0}
                  />
                  <fieldset className="min-w-0">
                    <legend className="mb-2 text-sm font-medium">Default pinned fields</legend>
                    {defaultFieldOptions.length === 0 ? (
                      <p className="text-sm text-text-muted">
                        Add fields to choose up to two pins.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {defaultFieldOptions.map((field) => {
                          const pins = defaults.pinnedFields ?? []
                          const position = pins.indexOf(field.value)
                          const checked = position !== -1
                          return (
                            <label
                              key={field.value}
                              className="flex min-h-9 items-center gap-2 rounded-md px-2 text-sm hover:bg-fill"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!checked && pins.length >= 2}
                                onChange={(event) => {
                                  const next = event.target.checked
                                    ? [...pins, field.value]
                                    : pins.filter((pin) => pin !== field.value)
                                  setDefaults({ ...defaults, pinnedFields: next })
                                }}
                              />
                              <span className="min-w-0 flex-1 truncate">{field.label}</span>
                              {checked && (
                                <span className="text-xs text-text-muted">{position + 1}</span>
                              )}
                            </label>
                          )
                        })}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-text-muted">
                      {defaults.pinnedFields === null
                        ? 'No kind-specific pin default is set.'
                        : defaults.pinnedFields.length === 0
                          ? 'No fields are pinned by default.'
                          : 'Pin order follows the numbers shown.'}
                    </p>
                    {defaults.pinnedFields === null ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1"
                        onClick={() => setDefaults({ ...defaults, pinnedFields: [] })}
                      >
                        Set no pins
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1"
                        onClick={() => setDefaults({ ...defaults, pinnedFields: null })}
                      >
                        Reset pins
                      </Button>
                    )}
                  </fieldset>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!defaultsDirty}
                    pending={updateKind.isPending}
                    onClick={() => void saveKindDefaults()}
                  >
                    Save kind settings
                  </Button>
                </div>
              </div>
            )}
            <div className="mt-5 flex items-end gap-2 border-t border-border pt-4">
              <div className="min-w-32 flex-1">
                <TextField
                  label="New field name"
                  value={fieldLabel}
                  onChange={(event) => setFieldLabel(event.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="min-w-28 flex-1">
                <Select
                  label="Field type"
                  options={[...fieldTypes]}
                  value={fieldType}
                  onValueChange={(value) => setFieldType(value as typeof fieldType)}
                />
              </div>
              <Button
                size="sm"
                onClick={() =>
                  void run(async () => {
                    await createField.mutateAsync({
                      kind: selected,
                      body: { label: fieldLabel.trim(), type: fieldType },
                    })
                    setFieldLabel('')
                  })
                }
                disabled={!fieldLabel.trim()}
                pending={createField.isPending}
              >
                Add
              </Button>
            </div>
            {selected.is_locked && (
              <p className="mt-2 text-xs text-text-muted">
                Built in fields are locked. You can add your own fields to this kind.
              </p>
            )}
            {selected.fields.length ? (
              <SortableProvider
                onMove={(move) => {
                  if (move.group !== 'kind-fields') return
                  const keys = customFields.map((field) => field.key)
                  const [moved] = keys.splice(move.from, 1)
                  if (moved) keys.splice(move.to, 0, moved)
                  void run(() => reorderFields.mutateAsync({ kind: selected, keys }))
                }}
              >
                <div className="mt-3 flex flex-col gap-2" role="list" aria-label="Fields">
                  {selected.fields.map((field) => (
                    <div key={field.key} className="contents">
                      {editingField?.key === field.key ? (
                        <form
                          className="flex min-h-14 items-center gap-2 rounded-md border border-border px-3"
                          onSubmit={(event) => {
                            event.preventDefault()
                            const label = fieldDraft.trim()
                            if (label)
                              void run(async () => {
                                await renameField.mutateAsync({ kind: selected, field, label })
                                setEditingField(null)
                              })
                          }}
                        >
                          <TextField
                            label="Field label"
                            value={fieldDraft}
                            onChange={(event) => setFieldDraft(event.target.value)}
                            className="min-w-0 flex-1"
                          />
                          <Button
                            type="submit"
                            size="sm"
                            disabled={!fieldDraft.trim()}
                            pending={renameField.isPending}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditingField(null)}
                          >
                            Cancel
                          </Button>
                        </form>
                      ) : (
                        <SortableField
                          field={field}
                          index={customFields.findIndex((entry) => entry.key === field.key)}
                          size={customFields.length}
                          onRename={() => {
                            setEditingField(field)
                            setFieldDraft(field.label)
                          }}
                          onDelete={() =>
                            void run(async () => {
                              const preview = await previewDelete.mutateAsync({
                                kind: selected,
                                field,
                              })
                              setConfirmDeleteField({
                                kind: selected,
                                field,
                                count: preview.populated_item_count,
                              })
                            })
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              </SortableProvider>
            ) : (
              <p className="mt-4 rounded-md bg-fill p-3 text-sm text-text-muted">
                No fields yet. Add a field above.
              </p>
            )}
          </>
        ) : (
          <div className="grid min-h-40 place-items-center text-center text-sm text-text-muted">
            Choose a kind to view and edit its fields.
          </div>
        )}
      </div>
      {operationError !== null && (
        <div
          role="alert"
          className="fixed inset-x-6 bottom-6 z-[60] mx-auto max-w-lg rounded-lg border border-warning-border bg-warning-bg p-4 text-sm text-warning-text shadow-float"
        >
          <p>{errorText(operationError)}</p>
          {conflict && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => void reloadLatest()}
            >
              Reload latest
            </Button>
          )}
          {!conflict && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => setOperationError(null)}
            >
              Dismiss
            </Button>
          )}
        </div>
      )}
      {confirmDeleteKind && (
        <AlertDialog
          open
          title={`Delete ${confirmDeleteKind.name}?`}
          description={
            affectedLists.length
              ? `${affectedLists.length} active ${affectedLists.length === 1 ? 'list uses' : 'lists use'} this kind: ${affectedLists.map((list) => list.name).join(', ')}. Change them to another kind before deleting this definition.`
              : 'No active lists use this kind. Deleting the definition cannot be undone.'
          }
          confirmLabel={affectedLists.length ? 'Choose target kind' : 'Delete kind'}
          destructive
          pending={deleteKind.isPending || treeQuery.isPending}
          onOpenChange={(open) => !open && !deleteKind.isPending && setConfirmDeleteKind(null)}
          onConfirm={() =>
            affectedLists.length
              ? (setConfirmDeleteKind(null), setConfirmChangeLists(confirmDeleteKind))
              : void run(async () => {
                  await deleteKind.mutateAsync(confirmDeleteKind)
                  setConfirmDeleteKind(null)
                  setSelectedKey(null)
                })
          }
        />
      )}
      {confirmChangeLists && (
        <AlertDialog
          open
          title={`Change lists from ${confirmChangeLists.name}?`}
          description="Changing a list's kind permanently clears the old kind's custom fields and price from all its items, including trashed items. Titles, images, descriptions and history stay. There is no undo."
          confirmLabel="Change listed kinds"
          destructive
          keepOpen
          pending={updateList.isPending || deleteKind.isPending}
          onOpenChange={(open) => !open && !updateList.isPending && setConfirmChangeLists(null)}
          onConfirm={() =>
            void run(async () => {
              if (!changeTargetKind) return
              const latestLists =
                treeQuery.data?.lists.filter((list) => list.kind === confirmChangeLists.key) ?? []
              if (latestLists.length === 0) {
                setConfirmChangeLists(null)
                setConfirmDeleteKind(confirmChangeLists)
                return
              }
              for (const list of latestLists) {
                await updateList.mutateAsync({ list, patch: { kind: changeTargetKind } })
              }
              await queryClient.refetchQueries({ queryKey: treeKeys.tree, type: 'active' })
              setConfirmChangeLists(null)
              setConfirmDeleteKind(confirmChangeLists)
            })
          }
        >
          <Select
            label="Change listed lists to"
            options={targetKinds.map((kind) => ({ value: kind.key, label: kind.name }))}
            value={changeTargetKind}
            onValueChange={setChangeTargetKind}
            disabled={updateList.isPending || targetKinds.length === 0}
          />
          <p className="text-sm text-text-muted">
            Lists:{' '}
            {treeQuery.data?.lists
              .filter((list) => list.kind === confirmChangeLists.key)
              .map((list) => list.name)
              .join(', ') || 'None'}
          </p>
        </AlertDialog>
      )}
      {confirmDeleteField && (
        <AlertDialog
          open
          title={`Delete ${confirmDeleteField.field.label}?`}
          description={
            confirmDeleteField.count === 0
              ? 'No items have a value for this field.'
              : `${confirmDeleteField.count} ${confirmDeleteField.count === 1 ? 'item has' : 'items have'} a value (including trashed items). Deleting the field removes those values, and any sort or pin that uses it falls back to the kind defaults.`
          }
          confirmLabel="Delete field"
          destructive
          onOpenChange={(open) => !open && setConfirmDeleteField(null)}
          onConfirm={() =>
            void run(async () => {
              await deleteField.mutateAsync(confirmDeleteField)
              setConfirmDeleteField(null)
            })
          }
          pending={deleteField.isPending}
        />
      )}
      {iconOpen && (
        <ListIconPicker
          title="Choose kind icon"
          kind="generic"
          showColorControls={false}
          value={
            iconTarget === 'create'
              ? icon
              : {
                  icon: defaults && defaults.kindKey === selected?.key ? defaults.icon : null,
                  icon_color: null,
                }
          }
          onChange={(choice) => {
            if (iconTarget === 'create') setIcon({ icon: choice.icon, icon_color: null })
            else if (defaults) setDefaults({ ...defaults, icon: choice.icon })
          }}
          onClose={() => setIconOpen(false)}
        />
      )}
    </div>
  )
}
