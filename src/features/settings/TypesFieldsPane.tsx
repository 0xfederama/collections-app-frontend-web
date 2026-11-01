import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Button, Skeleton } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { typeKeys } from '../../data/keys'
import { useTypes, type TypeDefinition, type TypeField } from './api'
import { TypeList } from './types/TypeList'
import { DeleteFieldDialog } from './types/DeleteFieldDialog'
import { OperationBanner } from './types/OperationBanner'
import { FieldsSection } from './types/FieldsSection'
import { useFieldDrafts } from './types/useFieldDrafts'
import { TypeHeader } from './types/TypeHeader'

export function TypesFieldsPane() {
  const queryClient = useQueryClient()
  const typesQuery = useTypes()
  const types = useMemo(() => typesQuery.data ?? [], [typesQuery.data])
  const [pickedKey, setSelectedKey] = useState<string | null>(null)
  // Until the user picks one (or after the picked type is gone), the first type is selected.
  const selected = types.find((type) => type.key === pickedKey) ?? types[0] ?? null
  const selectedKey = selected?.key ?? null
  const [confirmDeleteField, setConfirmDeleteField] = useState<{
    type: TypeDefinition
    field: TypeField
    count: number
  } | null>(null)
  const [operationError, setOperationError] = useState<unknown>(null)
  const [conflict, setConflict] = useState(false)
  const fieldDrafts = useFieldDrafts()

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

  // The drafts of the field forms stay as they are: the user's text is kept and saved again.
  const reloadLatest = async () => {
    try {
      await queryClient.refetchQueries({ queryKey: typeKeys.types }, { throwOnError: true })
      setOperationError(null)
      setConflict(false)
    } catch {
      setOperationError(new Error('The latest definition could not be loaded. Try again.'))
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
      />
      <div className="min-w-0 flex-1 sm:border-l sm:border-border sm:pl-5">
        {selected ? (
          <>
            <TypeHeader selected={selected} />
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
      {operationError !== null && (
        <OperationBanner
          error={operationError}
          conflict={conflict}
          onReload={reloadLatest}
          onDismiss={() => setOperationError(null)}
        />
      )}
      {confirmDeleteField && (
        <DeleteFieldDialog
          target={confirmDeleteField}
          onClose={() => setConfirmDeleteField(null)}
          run={run}
        />
      )}
    </div>
  )
}
