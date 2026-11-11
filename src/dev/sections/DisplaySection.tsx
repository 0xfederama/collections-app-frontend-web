import {
  Badge,
  Button,
  Card,
  EmptyState,
  SharedBadge,
  typeIcons,
  typeLabels,
  type ItemType,
} from '../../components/ui'
import { Folder, Inbox } from '../../components/ui/icons'
import { Row, Section } from './shared'

export function DisplaySection() {
  return (
    <Section id="display" title="Badge, Card, EmptyState">
      <Row label="Badge (types)">
        {([null, ...Object.keys(typeIcons)] as ItemType[]).map((type) => (
          <Badge key={type ?? 'none'} type={type} />
        ))}
      </Row>
      <Row label="Card">
        <Card className="w-56 p-4">Static card</Card>
        <Card interactive className="relative w-56 p-4">
          <a href="#display" className="font-medium after:absolute after:inset-0">
            Interactive card
          </a>
          <p className="tabular text-ui text-text-muted">€1,200–1,500</p>
        </Card>
      </Row>
      <Row label="Shared badge (F-027: a shared folder, a list inside one)">
        <SharedBadge shared={false}>
          <Folder className="size-6 text-text-muted" />
        </SharedBadge>
        <SharedBadge shared>
          <Folder className="size-6 text-text-muted" />
        </SharedBadge>
        <SharedBadge shared>
          <span className="grid size-8 place-items-center rounded-sm border border-border bg-fill text-text-muted">
            <Folder className="size-4" />
          </span>
        </SharedBadge>
      </Row>
      <Card>
        <EmptyState
          icon={Inbox}
          title="No lists yet"
          description="Create your first list to start collecting."
          action={<Button>Create list</Button>}
        />
      </Card>
      <p className="text-ui text-text-muted">Types: {Object.values(typeLabels).join(', ')}</p>
    </Section>
  )
}
