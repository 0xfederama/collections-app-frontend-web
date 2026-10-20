import { Button, IconButton } from '../../components/ui'
import { Plus, Search, Trash2 } from '../../components/ui/icons'
import { Row, Section } from './shared'

export function ButtonsSection() {
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
