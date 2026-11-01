import { useState } from 'react'
import { Combobox, Select, SegmentedControl } from '../../components/ui'
import { LayoutGrid, List, Rows3 } from '../../components/ui/icons'
import { Row, Section } from './shared'

const countries = [
  { value: 'it', label: 'Italy' },
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany' },
  { value: 'es', label: 'Spain' },
  { value: 'pt', label: 'Portugal' },
]

export function SelectionSection() {
  const [country, setCountry] = useState('it')
  const [combo, setCombo] = useState<string | null>(null)
  const [mode, setMode] = useState('grid')
  return (
    <Section id="selection" title="Select, Combobox, SegmentedControl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Country" options={countries} value={country} onValueChange={setCountry} />
        <Select
          label="Currency"
          options={countries}
          placeholder="Choose…"
          error="Pick a currency."
        />
        <Select
          label="Type (separators and an action)"
          options={[
            { value: 'none', label: 'No type' },
            { separator: true },
            { value: 'movie', label: 'Movies' },
            { value: 'vehicle', label: 'Vehicles' },
            { separator: true },
            { value: 'new', label: '+ New folder', action: true },
          ]}
          value="none"
        />
        <Select label="Disabled select" options={countries} disabled />
        <Combobox
          label="Country"
          options={countries}
          value={combo}
          onValueChange={setCombo}
          placeholder="Type to filter"
          emptyMessage="No matching country"
        />
      </div>
      <Row label="SegmentedControl (icons with labels)">
        <SegmentedControl
          aria-label="Display mode"
          value={mode}
          onValueChange={setMode}
          options={[
            { value: 'compact', label: 'Compact', icon: <Rows3 />, iconOnly: true },
            { value: 'thumbnail', label: 'Thumbnail', icon: <List />, iconOnly: true },
            { value: 'grid', label: 'Grid', icon: <LayoutGrid />, iconOnly: true },
          ]}
        />
        <SegmentedControl
          aria-label="Text options"
          value="b"
          onValueChange={() => {}}
          options={[
            { value: 'a', label: 'Manual' },
            { value: 'b', label: 'Title' },
            { value: 'c', label: 'Updated', disabled: true },
          ]}
        />
      </Row>
    </Section>
  )
}
