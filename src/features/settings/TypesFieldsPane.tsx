import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Button, Select, Skeleton, TextField } from '../../components/ui'
import { Plus } from '../../components/ui/icons'
import { SortableProvider } from '../../components/ui/sortable'
import { ApiError } from '../../lib/api'
import { ListIconMark, ListIconPicker, type IconChoice } from '../lists'
import { useTree } from '../tree'
import {
  typeKeys,
  useCreateTypeField,
  useTypes,
  usePreviewTypeFieldDelete,
  useRenameTypeField,
  useReorderTypeFields,
  useUpdateType,
  type TypeDefinition,
  type TypeField,
} from './api'
import {
  NONE_FIELD,
  defaultFieldOptions,
  defaultsFromType,
  defaultsPatch,
  fieldTypes,
  isDefaultsDirty,
  type TypeDefaultsDraft,
} from './types/model'
import { FieldRow } from './types/FieldRow'
import { TypeRow } from './types/TypeRow'
import { CreateTypeDialog } from './types/CreateTypeDialog'
import { DeleteTypeDialog } from './types/DeleteTypeDialog'
import { DeleteFieldDialog } from './types/DeleteFieldDialog'
import { OperationBanner } from './types/OperationBanner'
import { ChangeListsDialog } from './types/ChangeListsDialog'

export function TypesFieldsPane() {
  const queryClient = useQueryClient()
  const typesQuery = useTypes()
  const treeQuery = useTree()
  const updateType = useUpdateType()
  const createField = useCreateTypeField()
  const renameField = useRenameTypeField()
  const previewDelete = usePreviewTypeFieldDelete()
  const reorderFields = useReorderTypeFields()
  const types = useMemo(() => typesQuery.data ?? [], [typesQuery.data])
  const [pickedKey, setSelectedKey] = useState<string | null>(null)
  // Until the user picks one (or after the picked type is gone), the first type is selected.
  const selected = types.find((type) => type.key === pickedKey) ?? types[0] ?? null
  const selectedKey = selected?.key ?? null
  const [defaultsDraft, setDefaults] = useState<TypeDefaultsDraft | null>(null)
  const defaults =
    defaultsDraft && defaultsDraft.typeKey === selectedKey
      ? defaultsDraft
      : selected
        ? defaultsFromType(selected)
        : null
  const [renameDraft, setRenameDraft] = useState<{ key: string; name: string } | null>(null)
  const renameName =
    renameDraft && renameDraft.key === selectedKey ? renameDraft.name : (selected?.name ?? '')
  const setRenameName = (value: string) => {
    if (selectedKey) setRenameDraft({ key: selectedKey, name: value })
  }
  const [createOpen, setCreateOpen] = useState(false)
  const [fieldLabel, setFieldLabel] = useState('')
  const [fieldType, setFieldType] = useState<(typeof fieldTypes)[number]['value']>('text')
  const [icon, setIcon] = useState<IconChoice>({ icon: null, icon_color: null })
  const [iconOpen, setIconOpen] = useState(false)
  const [iconTarget, setIconTarget] = useState<'create' | 'type'>('create')
  const [editingField, setEditingField] = useState<TypeField | null>(null)
  const [fieldDraft, setFieldDraft] = useState('')
  const [confirmDeleteType, setConfirmDeleteType] = useState<TypeDefinition | null>(null)
  const [confirmChangeLists, setConfirmChangeLists] = useState<TypeDefinition | null>(null)
  const [confirmDeleteField, setConfirmDeleteField] = useState<{
    type: TypeDefinition
    field: TypeField
    count: number
  } | null>(null)
  const [operationError, setOperationError] = useState<unknown>(null)
  const [conflict, setConflict] = useState(false)
  const customFields = selected?.fields.filter((field) => !field.is_locked) ?? []
  const targetTypes = types.filter((type) => type.key !== confirmDeleteType?.key)
  const fieldOptions = defaultFieldOptions(selected, defaults?.allowsPrice ?? false)
  const defaultsDirty = isDefaultsDirty(selected, defaults)

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
      await queryClient.refetchQueries({ queryKey: typeKeys.types }, { throwOnError: true })
      const latest = queryClient.getQueryData<TypeDefinition[]>(typeKeys.types)
      const latestSelected = latest?.find((type) => type.key === selectedKey)
      if (latestSelected) {
        setDefaults(defaultsFromType(latestSelected))
        setRenameName(latestSelected.name)
      }
      setOperationError(null)
      setConflict(false)
    } catch {
      setOperationError(new Error('The latest definition could not be loaded. Try again.'))
    }
  }

  const saveTypeDefaults = async () => {
    if (!selected || !defaults || selected.is_locked) return
    const patch = defaultsPatch(selected, defaults)
    if (Object.keys(patch).length === 0) return

    try {
      setOperationError(null)
      setConflict(false)
      const updated = await updateType.mutateAsync({ type: selected, patch })
      setDefaults(defaultsFromType(updated))
    } catch (error) {
      setOperationError(error)
      if (error instanceof ApiError && error.status === 412) setConflict(true)
    }
  }

  if (typesQuery.isPending)
    return (
      <div role="status" className="flex flex-col gap-3">
        <span className="sr-only">Loading types</span>
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    )
  if (typesQuery.isError)
    return (
      <div role="alert" className="flex flex-col items-start gap-2 text-sm">
        <p>Couldn’t load types and fields.</p>
        <Button variant="secondary" onClick={() => void typesQuery.refetch()}>
          Retry
        </Button>
      </div>
    )

  return (
    <div className="flex flex-col gap-5 sm:flex-row">
      <div className="flex min-w-0 flex-col gap-1 sm:w-52 sm:shrink-0">
        <div className="flex flex-col gap-1" role="list" aria-label="Types">
          {types.map((type) => (
            <div role="listitem" key={type.key}>
              <TypeRow
                type={type}
                selected={selected?.key === type.key}
                onSelect={() => {
                  setSelectedKey(type.key)
                  setOperationError(null)
                }}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          title="New type"
          onClick={() => setCreateOpen(true)}
          className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-text-muted hover:bg-fill hover:text-text focus-visible:outline-2 focus-visible:outline-focus-ring"
        >
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-md bg-fill">
            <Plus className="size-4" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium">New type</span>
        </button>
      </div>
      <div className="min-w-0 flex-1 sm:border-l sm:border-border sm:pl-5">
        {selected ? (
          <>
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1 basis-40">
                <h3 className="text-base font-semibold break-words">{selected.name}</h3>
                <p className="text-xs text-text-muted">
                  {selected.is_locked
                    ? 'Built in type · settings are read only'
                    : `Key: ${selected.key}`}
                </p>
              </div>
              {!selected.is_locked && (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={treeQuery.isPending || treeQuery.isError}
                  onClick={() => setConfirmDeleteType(selected)}
                >
                  Delete type
                </Button>
              )}
            </div>
            {!selected.is_locked && defaults?.typeKey === selected.key && (
              <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-40 flex-1">
                    <TextField
                      label="Rename type"
                      value={renameName}
                      onChange={(event) => setRenameName(event.target.value)}
                      maxLength={100}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!renameName.trim() || renameName.trim() === selected.name}
                    pending={updateType.isPending}
                    onClick={() =>
                      void run(async () => {
                        const updated = await updateType.mutateAsync({
                          type: selected,
                          patch: { name: renameName.trim() },
                        })
                        setRenameName(updated.name)
                        setDefaults(defaultsFromType(updated))
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
                      setIconTarget('type')
                      setIconOpen(true)
                    }}
                  >
                    {defaults.icon ? 'Change icon' : 'Choose icon'}
                  </Button>
                  {defaults.icon && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Clear type icon"
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
                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                  <Select
                    label="Default sort field"
                    options={[{ value: NONE_FIELD, label: 'None' }, ...fieldOptions]}
                    value={defaults.sortField ?? NONE_FIELD}
                    onValueChange={(value) =>
                      setDefaults({
                        ...defaults,
                        sortField: value === NONE_FIELD ? null : value,
                      })
                    }
                    disabled={fieldOptions.length === 0}
                  />
                  <fieldset className="min-w-0">
                    <legend className="mb-2 text-sm font-medium">Default pinned fields</legend>
                    {fieldOptions.length === 0 ? (
                      <p className="text-sm text-text-muted">
                        Add fields to choose up to three pins.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {fieldOptions.map((field) => {
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
                                disabled={!checked && pins.length >= 3}
                                onChange={(event) => {
                                  const next = event.target.checked
                                    ? [...pins, field.value]
                                    : pins.filter((pin) => pin !== field.value)
                                  setDefaults({ ...defaults, pinnedFields: next })
                                }}
                              />
                              <span className="min-w-0 flex-1 break-words">{field.label}</span>
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
                        ? 'No type-specific pin default is set.'
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
                    pending={updateType.isPending}
                    onClick={() => void saveTypeDefaults()}
                  >
                    Save type settings
                  </Button>
                </div>
              </div>
            )}
            <div className="mt-5 flex flex-wrap items-end gap-2 border-t border-border pt-4">
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
                      type: selected,
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
                Built in fields are locked. You can add your own fields to this type.
              </p>
            )}
            {selected.fields.length ? (
              <SortableProvider
                onMove={(move) => {
                  if (move.group !== 'type-fields') return
                  const keys = customFields.map((field) => field.key)
                  const [moved] = keys.splice(move.from, 1)
                  if (moved) keys.splice(move.to, 0, moved)
                  void run(() => reorderFields.mutateAsync({ type: selected, keys }))
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
                                await renameField.mutateAsync({ type: selected, field, label })
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
                        <FieldRow
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
                                type: selected,
                                field,
                              })
                              setConfirmDeleteField({
                                type: selected,
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
            Choose a type to view and edit its fields.
          </div>
        )}
      </div>
      {createOpen && (
        <CreateTypeDialog
          onClose={() => setCreateOpen(false)}
          onCreated={(key) => {
            setIcon({ icon: null, icon_color: null })
            setSelectedKey(key)
            setOperationError(null)
          }}
          icon={icon}
          onPickIcon={() => {
            setIconTarget('create')
            setIconOpen(true)
          }}
        />
      )}
      {operationError !== null && (
        <OperationBanner
          error={operationError}
          conflict={conflict}
          onReload={reloadLatest}
          onDismiss={() => setOperationError(null)}
        />
      )}
      {confirmDeleteType && (
        <DeleteTypeDialog
          type={confirmDeleteType}
          lists={treeQuery.data?.lists ?? []}
          treePending={treeQuery.isPending}
          onChangeLists={() => {
            setConfirmDeleteType(null)
            setConfirmChangeLists(confirmDeleteType)
          }}
          onClose={() => setConfirmDeleteType(null)}
          run={run}
          onDeleted={() => {
            setConfirmDeleteType(null)
            setSelectedKey(null)
          }}
        />
      )}
      {confirmChangeLists && (
        <ChangeListsDialog
          type={confirmChangeLists}
          lists={treeQuery.data?.lists ?? []}
          targetTypes={targetTypes}
          onCancel={() => setConfirmChangeLists(null)}
          onDone={() => {
            setConfirmChangeLists(null)
            setConfirmDeleteType(confirmChangeLists)
          }}
          run={run}
        />
      )}
      {confirmDeleteField && (
        <DeleteFieldDialog
          target={confirmDeleteField}
          onClose={() => setConfirmDeleteField(null)}
          run={run}
        />
      )}
      {iconOpen && (
        <ListIconPicker
          title="Choose type icon"
          showColorControls={false}
          value={
            iconTarget === 'create'
              ? icon
              : {
                  icon: defaults && defaults.typeKey === selected?.key ? defaults.icon : null,
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
