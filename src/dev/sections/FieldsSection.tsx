import { TextArea, TextField } from '../../components/ui'
import { Section } from './shared'

export function FieldsSection() {
  return (
    <Section id="fields" title="Text fields">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Title" placeholder="Triumph Tiger 900" hint="Shown in lists." />
        <TextField label="Engine" suffix="cc" inputMode="numeric" defaultValue="937" />
        <TextField label="Price" prefix="€" inputMode="decimal" placeholder="0.00" />
        <TextField label="Official URL" defaultValue="nope" error="Enter a valid URL." />
        <TextField label="Disabled" disabled defaultValue="Read only" />
        <TextArea label="Summary" hint="Up to 500 characters." />
        <TextArea label="Notes" error="This field is required." defaultValue="" />
      </div>
    </Section>
  )
}
