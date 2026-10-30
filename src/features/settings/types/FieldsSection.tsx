import { Button, Select, TextField } from '../../../components/ui'
import { SortableProvider } from '../../../components/ui/sortable'
import {
  useCreateTypeField,
  usePreviewTypeFieldDelete,
  useRenameTypeField,
  useReorderTypeFields,
  type TypeDefinition,
  type TypeField,
} from '../api'
import { FieldRow } from './FieldRow'
import { fieldTypes } from './model'
import type { FieldDrafts } from './useFieldDrafts'

export function FieldsSection({
  selected,
  run,
  onConfirmDeleteField,
  drafts,
}: {
  selected: TypeDefinition
  run: (operation: () => Promise<unknown>) => Promise<void>
  onConfirmDeleteField: (target: { type: TypeDefinition; field: TypeField; count: number }) => void
  /** Owned by the pane, so the drafts survive its loading and no-selection views. */
  drafts: FieldDrafts
}) {
  const createField = useCreateTypeField()
  const renameField = useRenameTypeField()
  const previewDelete = usePreviewTypeFieldDelete()
  const reorderFields = useReorderTypeFields()
  const {
    fieldLabel,
    setFieldLabel,
    fieldType,
    setFieldType,
    editingField,
    setEditingField,
    fieldDraft,
    setFieldDraft,
  } = drafts
  const customFields = selected.fields.filter((field) => !field.is_locked)

  return (
    <>
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
        <p className="mt-2 text-secondary text-text-muted">
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
                        onConfirmDeleteField({
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
        <p className="mt-4 rounded-lg bg-fill p-3 text-ui text-text-muted">
          No fields yet. Add a field above.
        </p>
      )}
    </>
  )
}
