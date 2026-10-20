import { useEffect, useId, useState, type KeyboardEvent, type Ref } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { components } from '../../generated/schema'
import { api, unwrap } from '../../lib/api'
import { useSettings } from '../settings'
import type { ItemType } from './api'
import {
  hasSuggestions,
  lookupAvailable,
  lookupSource,
  type LookupSelection,
  type LookupSource,
  type LookupTitleSelection,
} from './lookup'

/** One TMDB suggestion row. */
type Row = {
  key: string
  title: string
  year: number | null
  cover: string | null
  selection: LookupSelection
}

const tmdbRow = (suggestion: components['schemas']['TmdbSuggestion']): Row => ({
  key: `tmdb-${suggestion.tmdb_id}`,
  title: suggestion.title,
  year: suggestion.year,
  cover: suggestion.poster_url,
  selection: { tmdb_id: suggestion.tmdb_id },
})

/** `GET /tmdb/suggestions`: answers `available` + `results`. */
async function fetchSuggestions(source: TmdbSource, q: string, signal: AbortSignal) {
  const body = await unwrap(
    api.GET('/api/v1/tmdb/suggestions', {
      params: { query: { type: source.tmdbType, q } },
      signal,
    }),
  )
  return { available: body.available, rows: body.results.map(tmdbRow) }
}

/** The meta line under a title: the year. */
const rowMeta = (row: Row) => (row.year === null ? '' : String(row.year))

/** The accessible name of a row: "The Matrix (1999)". */
const rowLabel = (row: Row) => `${row.title}${row.year === null ? '' : ` (${row.year})`}`

type TmdbSource = Extract<LookupSource, { provider: 'tmdb' }>

/**
 * Title input. For a movie or TV item it suggests TMDB titles as you type; picking one fills the
 * title and sends its id (without a pick the server takes the first result on create). For every
 * other type, books included (F-016: looked up on commit), it is a plain text input.
 */
export function TitleLookupField({
  type,
  title,
  onTitleChange,
  inputRef,
  onSelectionChange,
  onSuggestionSelect,
  error,
  className,
  inputClassName,
  placeholder,
  autoFocus,
}: {
  type: ItemType
  title: string
  onTitleChange: (title: string) => void
  inputRef?: Ref<HTMLInputElement>
  onSelectionChange: (selection: LookupSelection) => void
  onSuggestionSelect?: (selection: LookupTitleSelection) => void
  error?: string
  className?: string
  inputClassName?: string
  placeholder?: string
  autoFocus?: boolean
}) {
  const settings = useSettings()
  // The source is active only while this server offers it; otherwise the field is a plain input.
  const source = lookupSource(type)
  const active =
    hasSuggestions(type) && source?.provider === 'tmdb' && lookupAvailable(settings.data, source)
      ? source
      : undefined
  const [query, setQuery] = useState('')
  const [activeRow, setActiveRow] = useState(0)
  const [open, setOpen] = useState(false)
  const listboxId = useId()

  useEffect(() => {
    const timeout = window.setTimeout(() => setQuery(title.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [title])

  const suggestions = useQuery({
    queryKey: ['lookup', 'suggestions', active ?? null, query],
    enabled: !!active && query.length >= 2,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- `enabled` is false when `active` is undefined, so queryFn never runs without it
    queryFn: ({ signal }) => fetchSuggestions(active!, query, signal),
  })
  const results = suggestions.data?.available ? suggestions.data.rows : []
  const showList = !!active && open && query === title.trim() && results.length > 0

  const select = (row: Row) => {
    onTitleChange(row.title)
    onSelectionChange(row.selection)
    setOpen(false)
    onSuggestionSelect?.({ title: row.title, ...row.selection })
  }
  const change = (value: string) => {
    onSelectionChange({})
    setActiveRow(0)
    setOpen(true)
    onTitleChange(value)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showList) {
      if (event.key === 'ArrowDown' && results.length) setOpen(true)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveRow((index) => (index + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveRow((index) => (index - 1 + results.length) % results.length)
    } else if (event.key === 'Enter' && results[activeRow]) {
      event.preventDefault()
      event.stopPropagation()
      select(results[activeRow])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className={`relative min-w-0 ${className ?? ''}`}>
      <input
        ref={inputRef}
        type="text"
        role={active ? 'combobox' : undefined}
        aria-label="Title"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${listboxId}-error` : undefined}
        aria-autocomplete={active ? 'list' : undefined}
        aria-controls={showList ? listboxId : undefined}
        aria-haspopup={active ? 'listbox' : undefined}
        aria-expanded={active ? showList : undefined}
        aria-activedescendant={showList ? `${listboxId}-${activeRow}` : undefined}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- focus is the caller's choice (the autoFocus prop; the new-item draft and Quick add set it)
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder={placeholder}
        value={title}
        onChange={(event) => change(event.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={() => window.setTimeout(() => setOpen(false), 100)}
        className={inputClassName}
      />
      {error && (
        <p id={`${listboxId}-error`} className="text-xs font-medium text-danger-text">
          {error}
        </p>
      )}
      {showList && active && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={`${active.name} title suggestions`}
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-md border border-border bg-surface p-1 shadow-float"
        >
          {results.map((row, index) => (
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- a pointer shortcut; the keyboard picks a suggestion from the title input (onKeyDown, aria-activedescendant)
            <li
              key={row.key}
              id={`${listboxId}-${index}`}
              role="option"
              aria-label={rowLabel(row)}
              aria-selected={index === activeRow}
              onMouseEnter={() => setActiveRow(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(row)}
              className={`flex cursor-pointer items-center gap-3 rounded-sm p-2 text-left ${index === activeRow ? 'bg-fill' : ''}`}
            >
              {row.cover ? (
                <img
                  src={row.cover}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-12 w-8 shrink-0 rounded-sm object-cover"
                />
              ) : (
                <span aria-hidden className="h-12 w-8 shrink-0 rounded-sm bg-fill" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text">{row.title}</span>
                {rowMeta(row) && (
                  <span className="block truncate text-xs text-text-muted">{rowMeta(row)}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
