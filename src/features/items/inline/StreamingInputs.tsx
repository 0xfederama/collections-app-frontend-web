import { focusRing } from '../../../components/ui'
import { cx } from '../../../lib/cx'
import { joinStoreKeys, parseStoreKeys, useStoreProviders } from '../../stores'
import { StoreChoices } from '../../stores/screens'
import type { TypeField } from '../types'
import { parsePlatforms } from '../form/draft'
import type { FieldForm } from './editors'
import { StreamingPlatforms } from './StreamingPlatforms'

/** The platforms (a multi-choice dropdown), and a toggle per platform for "paid per title". */
export function StreamingInputs({ form }: { form: FieldForm }) {
  const { draft, errors, set } = form
  const platforms = parsePlatforms(draft.streamingPlatforms)
  const isPaid = (name: string) =>
    draft.streamingPaid.some((paid) => paid.toLowerCase() === name.toLowerCase())
  const toggle = (name: string) =>
    set(
      'streamingPaid',
      isPaid(name)
        ? draft.streamingPaid.filter((paid) => paid.toLowerCase() !== name.toLowerCase())
        : [...draft.streamingPaid, name],
      'metadata.streaming.platforms',
    )
  return (
    <div className="flex flex-col gap-3">
      {/* F011-W1: the country is not asked here. The contract still requires it on every streaming
          object, so the draft sends the item's own country, or the one from Settings when it has
          none (`toFields`). */}
      <div>
        <p className="mb-1.5 text-ui text-text">Streaming platforms</p>
        <StreamingPlatforms
          value={platforms}
          onChange={(next) =>
            set('streamingPlatforms', next.join(', '), 'metadata.streaming.platforms')
          }
          error={errors['metadata.streaming.platforms']}
        />
        {errors['metadata.streaming.country'] && (
          <p className="mt-1.5 text-secondary text-danger-text">
            {errors['metadata.streaming.country']}
          </p>
        )}
      </div>
      {platforms.length > 0 && (
        <div role="group" aria-label="Paid platforms" className="flex flex-col gap-1.5">
          <p className="text-secondary text-text-muted">
            Mark the platforms that offer it only for payment ($).
          </p>
          <ul className="flex flex-wrap gap-2">
            {platforms.map((name) => (
              <li key={name.toLowerCase()}>
                <button
                  type="button"
                  aria-pressed={isPaid(name)}
                  onClick={() => toggle(name)}
                  className={cx(
                    'inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-ui pointer-coarse:min-h-11',
                    focusRing,
                    isPaid(name)
                      ? 'border-accent bg-accent-tint text-accent-text'
                      : 'border-border-strong bg-surface text-text',
                  )}
                >
                  {name}
                  <span aria-hidden>{isPaid(name) ? '$' : ''}</span>
                  <span className="sr-only">{isPaid(name) ? ', paid' : ', included'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** The stores of a `stores` field (F016-W4): ticked from the fixed list, saved as one key list. */
export function StoresInputs({ form, field }: { form: FieldForm; field: TypeField }) {
  const providers = useStoreProviders()
  return (
    <StoreChoices
      value={parseStoreKeys(form.draft.meta[field.key] ?? '')}
      onChange={(next) => form.setMeta(field.key, joinStoreKeys(next))}
      providers={providers.data}
      label={field.label}
    />
  )
}
