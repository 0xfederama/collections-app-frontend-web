import { useState, type ReactNode } from 'react'
import {
  AlertDialog,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Chip,
  Combobox,
  Dialog,
  Drawer,
  EmptyState,
  IconButton,
  Menu,
  SegmentedControl,
  Select,
  Skeleton,
  TextArea,
  TextField,
  ToastProvider,
  Tooltip,
  Tree,
  kindIcons,
  kindLabels,
  useToast,
  type ItemKind,
} from '../components/ui'
import {
  Ellipsis,
  Folder,
  Inbox,
  LayoutGrid,
  List,
  Monitor,
  Moon,
  Plus,
  Rows3,
  Search,
  Sun,
  Trash2,
} from '../components/ui/icons'
import { arrayMove } from '../components/ui/sortable'
import { useThemePreference, type ThemePreference } from '../lib/theme'

const sections = [
  'buttons',
  'fields',
  'selection',
  'overlays',
  'feedback',
  'display',
  'navigation',
] as const

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-20 flex-col gap-4">
      <h2 id={`${id}-title`} className="font-display text-2xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-text-muted">{label}</h3>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

const countries = [
  { value: 'it', label: 'Italy' },
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany' },
  { value: 'es', label: 'Spain' },
  { value: 'pt', label: 'Portugal' },
]

interface DemoNode {
  id: string
  name: string
  children?: DemoNode[]
}
const treeData: DemoNode[] = [
  {
    id: 'bikes',
    name: 'Bikes',
    children: [
      { id: 'adventure', name: 'Adventure' },
      { id: 'naked', name: 'Naked', children: [{ id: 'wishlist', name: 'Wishlist' }] },
    ],
  },
  { id: 'movies', name: 'Movies' },
]

function Buttons() {
  return (
    <Section id="buttons" title="Buttons">
      {(['primary', 'secondary', 'ghost', 'danger'] as const).map((variant) => (
        <Row key={variant} label={variant}>
          <Button variant={variant}>Default</Button>
          <Button variant={variant} size="sm">
            Small
          </Button>
          <Button variant={variant} pending>
            Pending
          </Button>
          <Button variant={variant} disabled>
            Disabled
          </Button>
        </Row>
      ))}
      <Row label="IconButton">
        <IconButton aria-label="Add">
          <Plus aria-hidden />
        </IconButton>
        <IconButton aria-label="Search" variant="secondary">
          <Search aria-hidden />
        </IconButton>
        <IconButton aria-label="Delete" variant="danger">
          <Trash2 aria-hidden />
        </IconButton>
        <IconButton aria-label="Disabled" disabled>
          <Plus aria-hidden />
        </IconButton>
      </Row>
    </Section>
  )
}

function Fields() {
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

function Selection() {
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
        <Select label="Disabled select" options={countries} disabled />
        <Combobox
          label="Streaming country"
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

function Overlays() {
  const [dialog, setDialog] = useState(false)
  const [alert, setAlert] = useState(false)
  return (
    <Section id="overlays" title="Menu, Dialog, AlertDialog, Drawer, Tooltip">
      <Row label="Menu">
        <Menu
          trigger={
            <IconButton aria-label="List actions" variant="secondary">
              <Ellipsis aria-hidden />
            </IconButton>
          }
          items={[
            { label: 'Rename', onSelect: () => {} },
            { label: 'Move…', onSelect: () => {} },
            { label: 'Unavailable', onSelect: () => {}, disabled: true },
            { type: 'separator' },
            { label: 'Delete', onSelect: () => {}, destructive: true, icon: <Trash2 /> },
          ]}
        />
      </Row>
      <Row label="Dialog / AlertDialog / Drawer">
        <Dialog
          open={dialog}
          onOpenChange={setDialog}
          title="New list"
          description="Name your list. You can move it later."
          trigger={<Button variant="secondary">Open dialog</Button>}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialog(false)}>Create</Button>
            </>
          }
        >
          <TextField label="Name" />
        </Dialog>
        <AlertDialog
          open={alert}
          onOpenChange={setAlert}
          trigger={<Button variant="danger">Delete list…</Button>}
          title="Delete this list?"
          description="It moves to Trash with its 12 items."
          confirmLabel="Delete"
          destructive
          onConfirm={() => setAlert(false)}
        />
        <Drawer
          title="History"
          description="Earlier versions of this description."
          trigger={<Button variant="secondary">Open drawer</Button>}
        >
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </Drawer>
        <Drawer
          side="left"
          title="Collections"
          trigger={<Button variant="secondary">Open left drawer</Button>}
        />
      </Row>
      <Row label="Tooltip">
        <Tooltip content="Add an item">
          <IconButton aria-label="Add item" variant="secondary">
            <Plus aria-hidden />
          </IconButton>
        </Tooltip>
      </Row>
    </Section>
  )
}

function Feedback() {
  const toast = useToast()
  return (
    <Section id="feedback" title="Toast, Chip, Skeleton">
      <Row label="Toast">
        <Button variant="secondary" onClick={() => toast({ kind: 'success', title: 'Item saved' })}>
          Success
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast({ kind: 'error', title: 'Could not save', description: 'Try again.' })
          }
        >
          Error
        </Button>
        <Button
          variant="secondary"
          onClick={() => toast({ kind: 'info', title: 'List changed, order refreshed.' })}
        >
          Info
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast({
              kind: 'success',
              title: 'Restored “Old cameras”',
              action: { label: 'Open', onAction: () => {} },
            })
          }
        >
          With action
        </Button>
      </Row>
      <Row label="Chip (text always shown)">
        <Chip>Backlog</Chip>
        <Chip tone="accent">Watching</Chip>
        <Chip tone="success">Owned</Chip>
        <Chip tone="warning">Wishlist</Chip>
        <Chip tone="danger">Sold</Chip>
      </Row>
      <Row label="Skeleton">
        <div className="flex w-64 flex-col gap-2">
          <Skeleton className="aspect-[4/3] w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </Row>
    </Section>
  )
}

function Display() {
  return (
    <Section id="display" title="Badge, Card, EmptyState">
      <Row label="Badge (kinds)">
        {(Object.keys(kindIcons) as ItemKind[]).map((kind) => (
          <Badge key={kind} kind={kind} />
        ))}
      </Row>
      <Row label="Card">
        <Card className="w-56 p-4">Static card</Card>
        <Card interactive className="relative w-56 p-4">
          <a href="#display" className="font-medium after:absolute after:inset-0">
            Interactive card
          </a>
          <p className="tabular text-sm text-text-muted">€1,200–1,500</p>
        </Card>
      </Row>
      <Card>
        <EmptyState
          icon={Inbox}
          title="No lists yet"
          description="Create your first list to start collecting."
          action={<Button>Create list</Button>}
        />
      </Card>
      <p className="text-sm text-text-muted">
        Kinds: {(Object.keys(kindLabels) as ItemKind[]).map((k) => kindLabels[k]).join(', ')}
      </p>
    </Section>
  )
}

function Navigation() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['bikes']))
  const [selected, setSelected] = useState<string | null>('adventure')
  return (
    <Section id="navigation" title="Breadcrumbs, Tree">
      <Breadcrumbs
        items={[
          { label: 'Bikes', to: '/bikes' },
          { label: 'Naked', to: '/naked' },
          { label: 'Wishlist' },
        ]}
      />

      <div className="max-w-xs rounded-lg border border-border bg-surface p-2">
        <Tree
          aria-label="Collections"
          nodes={treeData}
          expanded={expanded}
          onExpandedChange={setExpanded}
          selected={selected}
          onSelectedChange={setSelected}
          renderRow={(node) => (
            <span className="flex items-center gap-2">
              <Folder aria-hidden className="size-4 text-text-muted" />
              {node.name}
            </span>
          )}
        />
      </div>

      <SortableTreeDemo />
    </Section>
  )
}

/** Tree with drag reorder: grab the handle (hover or focus a row) or use Space, arrows, Space on it. */
function SortableTreeDemo() {
  const [names, setNames] = useState(['Alpha', 'Beta', 'Gamma', 'Delta'])
  return (
    <div className="max-w-xs rounded-lg border border-border bg-surface p-2">
      <p className="px-2 pb-1 text-xs text-text-muted">Reorderable (drag handle, keyboard)</p>
      <Tree
        aria-label="Reorderable lists"
        nodes={names.map((name) => ({ id: name, name }))}
        expanded={new Set()}
        onExpandedChange={() => {}}
        selected={null}
        onSelectedChange={() => {}}
        sortable={(node) => ({
          group: 'demo',
          index: names.indexOf(node.id),
          size: names.length,
          label: node.id,
        })}
        onReorder={({ from, to }) => setNames((current) => arrayMove(current, from, to))}
        renderRow={(node) => <span className="min-w-0 flex-1 truncate">{node.name}</span>}
      />
    </div>
  )
}

const themeOptions: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  { value: 'system', label: 'System', icon: <Monitor /> },
  { value: 'light', label: 'Light', icon: <Sun /> },
  { value: 'dark', label: 'Dark', icon: <Moon /> },
]

export function DevUiRoute() {
  const { preference, resolved, setPreference } = useThemePreference()
  return (
    <ToastProvider>
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-6 sm:px-6">
        <header className="sticky top-0 z-30 -mx-4 flex flex-col gap-3 border-b border-border bg-bg px-4 py-3 sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-3xl font-semibold">UI gallery</h1>
            <SegmentedControl
              aria-label="Theme"
              value={preference}
              onValueChange={(v) => setPreference(v as ThemePreference)}
              options={themeOptions}
            />
          </div>
          <nav aria-label="Gallery sections">
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {sections.map((id) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="text-accent-text underline-offset-2 hover:underline"
                  >
                    {id}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <p className="sr-only" aria-live="polite">
            Theme: {resolved}
          </p>
        </header>
        <Buttons />
        <Fields />
        <Selection />
        <Overlays />
        <Feedback />
        <Display />
        <Navigation />
      </div>
    </ToastProvider>
  )
}
