import { ServiceIcon, TILE_SIZE } from '../../components/ServiceIcon'
import { SERVICES } from '../../components/serviceIcons/registry'
import { Row, Section } from './shared'

/** The sizes the app uses: the list row, the picker and the item detail (F017-W3). */
const SIZES = [
  { size: 20, label: 'row 20' },
  { size: 26, label: 'picker 26' },
  { size: TILE_SIZE, label: `detail ${TILE_SIZE}` },
] as const

export function ServiceIconsSection() {
  return (
    <Section id="service-icons" title="Service icons">
      <p className="text-sm text-text-muted">
        Every registry entry at the sizes used in the app. The page theme applies: toggle it above
        to see light and dark.
      </p>
      <Row label="Registry (every entry)">
        <ul className="grid w-full grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
          {SERVICES.map((entry) => (
            <li key={entry.key} className="flex flex-col gap-2">
              <div className="flex items-end gap-3">
                {SIZES.map(({ size, label }) => (
                  <div key={size} className="flex flex-col items-center gap-1">
                    <ServiceIcon name={entry.key} size={size} />
                    <span className="text-[10px] text-text-muted">{label}</span>
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <div className="font-medium">{entry.label}</div>
                <div className="font-mono text-xs text-text-muted">{entry.key}</div>
                <div className="font-mono text-xs text-text-muted">{entry.file}</div>
              </div>
            </li>
          ))}
        </ul>
      </Row>
      <Row label="Unknown name and paid">
        <div className="flex flex-col items-center gap-1">
          <ServiceIcon name="Zattoo" />
          <span className="text-[10px] text-text-muted">unknown</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ServiceIcon name="Netflix" paid />
          <span className="text-[10px] text-text-muted">paid</span>
        </div>
      </Row>
    </Section>
  )
}
