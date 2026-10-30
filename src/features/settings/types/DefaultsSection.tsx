import { useState } from 'react'
import { Button, Select, TextField } from '../../../components/ui'
import { ListIconMark, ListIconPicker } from '../../lists'
import type { TypeDefinition } from '../api'
import { NONE_FIELD, type TypeDefaultsDraft } from './model'

export function DefaultsSection({
  selected,
  defaults,
  onChange,
  renameName,
  onRenameChange,
  onRename,
  dirty,
  onSave,
  pending,
  fieldOptions,
}: {
  selected: TypeDefinition
  defaults: TypeDefaultsDraft
  onChange: (next: TypeDefaultsDraft) => void
  renameName: string
  onRenameChange: (value: string) => void
  onRename: () => void
  dirty: boolean
  onSave: () => void
  pending: boolean
  fieldOptions: { value: string; label: string }[]
}) {
  const [iconOpen, setIconOpen] = useState(false)
  return (
    <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <TextField
            label="Rename type"
            value={renameName}
            onChange={(event) => onRenameChange(event.target.value)}
            maxLength={100}
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={!renameName.trim() || renameName.trim() === selected.name}
          pending={pending}
          onClick={onRename}
        >
          Save name
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ListIconMark icon={defaults.icon} className="size-9" iconClassName="size-4" />
        <Button variant="secondary" size="sm" onClick={() => setIconOpen(true)}>
          {defaults.icon ? 'Change icon' : 'Choose icon'}
        </Button>
        {defaults.icon && (
          <Button
            variant="ghost"
            size="sm"
            aria-label="Clear type icon"
            onClick={() => onChange({ ...defaults, icon: null })}
          >
            Clear icon
          </Button>
        )}
        <label className="ml-1 flex min-h-10 items-center gap-2 text-ui">
          <input
            type="checkbox"
            aria-label="Allow prices for items"
            checked={defaults.allowsPrice}
            onChange={(event) => {
              const allows = event.target.checked
              onChange({
                ...defaults,
                allowsPrice: allows,
                sortField: allows || defaults.sortField !== 'price' ? defaults.sortField : null,
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
            onChange({
              ...defaults,
              sortField: value === NONE_FIELD ? null : value,
            })
          }
          disabled={fieldOptions.length === 0}
        />
        <fieldset className="min-w-0">
          <legend className="mb-2 text-ui font-medium">Default pinned fields</legend>
          {fieldOptions.length === 0 ? (
            <p className="text-ui text-text-muted">Add fields to choose up to three pins.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {fieldOptions.map((field) => {
                const pins = defaults.pinnedFields ?? []
                const position = pins.indexOf(field.value)
                const checked = position !== -1
                return (
                  <label
                    key={field.value}
                    className="flex min-h-9 items-center gap-2 rounded-md px-2 text-ui hover:bg-fill"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && pins.length >= 3}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...pins, field.value]
                          : pins.filter((pin) => pin !== field.value)
                        onChange({ ...defaults, pinnedFields: next })
                      }}
                    />
                    <span className="min-w-0 flex-1 break-words">{field.label}</span>
                    {checked && (
                      <span className="font-mono text-secondary text-text-muted">
                        {position + 1}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          )}
          <p className="mt-1 text-secondary text-text-muted">
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
              onClick={() => onChange({ ...defaults, pinnedFields: [] })}
            >
              Set no pins
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1"
              onClick={() => onChange({ ...defaults, pinnedFields: null })}
            >
              Reset pins
            </Button>
          )}
        </fieldset>
      </div>
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" disabled={!dirty} pending={pending} onClick={onSave}>
          Save type settings
        </Button>
      </div>
      {iconOpen && (
        <ListIconPicker
          title="Choose type icon"
          showColorControls={false}
          value={{ icon: defaults.icon, icon_color: null }}
          onChange={(choice) => onChange({ ...defaults, icon: choice.icon })}
          onClose={() => setIconOpen(false)}
        />
      )}
    </div>
  )
}
