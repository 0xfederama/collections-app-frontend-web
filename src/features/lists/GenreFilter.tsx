import { X } from '../../components/ui/icons'
import { toggleGenre } from './genres'

export interface GenreChoicesProps {
  /** The genres the list's items have (`useListGenres`). */
  genres: readonly string[]
  /** The chosen genres; an item matches when it has any of them (any-of, F-028 W3). */
  value: string[]
  onChange: (next: string[]) => void
}

/** The list's genres as checkboxes in the Filter menu (F-028 W3). Native checkboxes, so keyboard and screen readers get the usual semantics. */
export function GenreChoices({ genres, value, onChange }: GenreChoicesProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-secondary text-text-muted">Filter by genre</legend>
      <div className="flex max-w-80 flex-wrap gap-x-4 gap-y-1">
        {genres.map((genre) => (
          <label
            key={genre}
            className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-ui text-text pointer-coarse:min-h-11"
          >
            <input
              type="checkbox"
              checked={value.includes(genre)}
              onChange={() => onChange(toggleGenre(value, genre))}
              className="size-4 accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            />
            {genre}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** The applied genres as removable chips under the toolbar, like `AvailabilityChip` (nothing while none is chosen). */
export function GenreChips({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <>
      {value.map((genre) => {
        const text = `Genre: ${genre}`
        return (
          <span
            key={genre}
            className="inline-flex items-center gap-1 rounded-full border border-accent-tint bg-accent-tint py-0.5 pr-1 pl-3 text-ui text-accent-text"
          >
            {text}
            <button
              type="button"
              aria-label={`Remove filter ${text}`}
              onClick={() => onChange(value.filter((picked) => picked !== genre))}
              className="grid size-6 place-items-center rounded-full hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-focus-ring pointer-coarse:size-8"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </span>
        )
      })}
    </>
  )
}
