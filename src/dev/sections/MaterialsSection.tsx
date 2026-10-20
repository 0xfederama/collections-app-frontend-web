import { Row, Section } from './shared'

/** Frosted materials over strips of strong color (stand-ins for the lightest and darkest images). */
export function MaterialsSection() {
  return (
    <Section id="materials" title="Materials and shadows">
      <div
        className="flex h-48 items-end gap-3 overflow-hidden rounded-xl p-4"
        style={{
          backgroundImage:
            'linear-gradient(90deg, #ffffff 0 25%, #f4c542 25% 50%, #1d3557 50% 75%, #000000 75% 100%)',
        }}
      >
        <div className="material flex-1 rounded-full px-4 py-2 text-sm shadow-float">
          Toolbar (material)
        </div>
        <div className="material-strong flex-1 rounded-xl p-4 text-sm shadow-sheet">
          Sheet (material-strong)
          <p className="text-text-muted">Muted text on glass</p>
        </div>
      </div>
      <Row label="Shadow scale">
        {(['shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-float', 'shadow-sheet'] as const).map(
          (shadow) => (
            <div key={shadow} className={`rounded-lg bg-surface p-4 text-sm ${shadow}`}>
              {shadow}
            </div>
          ),
        )}
      </Row>
      <p className="text-sm text-text-muted">
        Under prefers-reduced-transparency or without backdrop-filter, the glass above turns solid.
      </p>
    </Section>
  )
}
