import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Button, Skeleton } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { ListIconPicker, type IconChoice } from '../lists'
import { useTree } from '../tree'
import { typeKeys } from '../../data/keys'
import { useTypes, useUpdateType, type TypeDefinition, type TypeField } from './api'
import {
  defaultFieldOptions,
  defaultsFromType,
  defaultsPatch,
  isDefaultsDirty,
  type TypeDefaultsDraft,
} from './types/model'
import { TypeList } from './types/TypeList'
import { CreateTypeDialog } from './types/CreateTypeDialog'
import { DeleteTypeDialog } from './types/DeleteTypeDialog'
import { DeleteFieldDialog } from './types/DeleteFieldDialog'
import { OperationBanner } from './types/OperationBanner'
import { ChangeListsDialog } from './types/ChangeListsDialog'
import { FieldsSection } from './types/FieldsSection'
import { useFieldDrafts } from './types/useFieldDrafts'
import { TypeHeader } from './types/TypeHeader'
import { DefaultsSection } from './types/DefaultsSection'

export function TypesFieldsPane() {
  const queryClient = useQueryClient()
  const typesQuery = useTypes()
  const treeQuery = useTree()
  const updateType = useUpdateType()
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
  const [icon, setIcon] = useState<IconChoice>({ icon: null, icon_color: null })
  const [iconOpen, setIconOpen] = useState(false)
  const [confirmDeleteType, setConfirmDeleteType] = useState<TypeDefinition | null>(null)
  const [confirmChangeLists, setConfirmChangeLists] = useState<TypeDefinition | null>(null)
  const [confirmDeleteField, setConfirmDeleteField] = useState<{
    type: TypeDefinition
    field: TypeField
    count: number
  } | null>(null)
  const [operationError, setOperationError] = useState<unknown>(null)
  const [conflict, setConflict] = useState(false)
  const fieldDrafts = useFieldDrafts()
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
      <div role="alert" className="flex flex-col items-start gap-2 text-ui">
        <p>Couldn’t load types and fields.</p>
        <Button variant="secondary" onClick={() => void typesQuery.refetch()}>
          Retry
        </Button>
      </div>
    )

  return (
    <div className="flex flex-col gap-5 sm:flex-row">
      <TypeList
        types={types}
        selectedKey={selectedKey}
        onSelect={(key) => {
          setSelectedKey(key)
          setOperationError(null)
        }}
        onCreate={() => setCreateOpen(true)}
      />
      <div className="min-w-0 flex-1 sm:border-l sm:border-border sm:pl-5">
        {selected ? (
          <>
            <TypeHeader
              selected={selected}
              deleteDisabled={treeQuery.isPending || treeQuery.isError}
              onDelete={() => setConfirmDeleteType(selected)}
            />
            {!selected.is_locked && defaults?.typeKey === selected.key && (
              <DefaultsSection
                selected={selected}
                defaults={defaults}
                onChange={setDefaults}
                renameName={renameName}
                onRenameChange={setRenameName}
                onRename={() =>
                  void run(async () => {
                    const updated = await updateType.mutateAsync({
                      type: selected,
                      patch: { name: renameName.trim() },
                    })
                    setRenameName(updated.name)
                    setDefaults(defaultsFromType(updated))
                  })
                }
                dirty={defaultsDirty}
                onSave={() => void saveTypeDefaults()}
                pending={updateType.isPending}
                fieldOptions={fieldOptions}
              />
            )}
            <FieldsSection
              selected={selected}
              run={run}
              onConfirmDeleteField={setConfirmDeleteField}
              drafts={fieldDrafts}
            />
          </>
        ) : (
          <div className="grid min-h-40 place-items-center text-center text-ui text-text-muted">
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
          onPickIcon={() => setIconOpen(true)}
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
          value={icon}
          onChange={(choice) => setIcon({ icon: choice.icon, icon_color: null })}
          onClose={() => setIconOpen(false)}
        />
      )}
    </div>
  )
}
