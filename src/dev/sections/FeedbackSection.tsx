import { Button, Chip, Skeleton, useToast } from '../../components/ui'
import { LinkIcon, ServiceIcon } from '../../components/ServiceIcon'
import { Row, Section } from './shared'

export function FeedbackSection() {
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
      <Row label="ServiceIcon (free, paid, unknown)">
        {['Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'YouTube', 'TIMvision', 'Infinity'].map(
          (n) => (
            <ServiceIcon key={n} name={n} />
          ),
        )}
        <ServiceIcon name="Netflix" paid />
        <ServiceIcon name="Netflix" size={48} />
        <ServiceIcon name="Hulu" />
      </Row>
      <Row label="LinkIcon">
        {['Google', 'Letterboxd', 'IMDb', 'Reddit', 'Website'].map((n) => (
          <LinkIcon key={n} name={n} />
        ))}
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
