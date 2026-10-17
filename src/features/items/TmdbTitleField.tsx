import { useEffect, useId, useState, type KeyboardEvent, type Ref } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { components } from '../../generated/schema'
import { api, unwrap } from '../../lib/api'
import { useSettings } from '../settings/api'
import type { ItemKind } from './api'

type Suggestion = components['schemas']['TmdbSuggestion']
type TmdbKind = components['schemas']['TmdbKind']

const toTmdbKind = (kind: ItemKind): TmdbKind | undefined =>
  kind === 'movie' || kind === 'tv_show' ? kind : undefined

/** Movie and TV title input with localized TMDB suggestions. Selection never replaces typed text. */
export function TmdbTitleField({
  kind,
  title,
  onTitleChange,
  inputRef,
  onSelectionChange,
  error,
  className,
  inputClassName,
  placeholder,
  autoFocus,
}: {
  kind: ItemKind
  title: string
  onTitleChange: (title: string) => void
  inputRef?: Ref<HTMLInputElement>
  onSelectionChange: (id: number | undefined) => void
  error?: string
  className?: string
  inputClassName?: string
  placeholder?: string
  autoFocus?: boolean
}) {
  const tmdbKind = toTmdbKind(kind)
  const settings = useSettings()
  const available = settings.data?.lookup_available === true
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const listboxId = useId()

  useEffect(() => {
    const timeout = window.setTimeout(() => setQuery(title.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [title])

  const suggestions = useQuery({
    queryKey: ['tmdb', 'suggestions', tmdbKind, query],
    enabled: !!tmdbKind && available && query.length >= 2,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/api/v1/tmdb/suggestions', {
          params: { query: { kind: tmdbKind!, q: query } },
          signal,
        }),
      ),
  })
  const results = suggestions.data?.available ? suggestions.data.results : []
  const showList = open && available && query === title.trim() && results.length > 0

  const select = (suggestion: Suggestion) => {
    onSelectionChange(suggestion.tmdb_id)
    setOpen(false)
  }
  const change = (value: string) => {
    onSelectionChange(undefined)
    setActive(0)
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
      setActive((index) => (index + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => (index - 1 + results.length) % results.length)
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault()
      event.stopPropagation()
      select(results[active])
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
        role={available && tmdbKind ? 'combobox' : undefined}
        aria-label="Title"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${listboxId}-error` : undefined}
        aria-autocomplete={available && tmdbKind ? 'list' : undefined}
        aria-controls={showList ? listboxId : undefined}
        aria-haspopup={available && tmdbKind ? 'listbox' : undefined}
        aria-expanded={available && tmdbKind ? showList : undefined}
        aria-activedescendant={showList ? `${listboxId}-${active}` : undefined}
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
      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="TMDB title suggestions"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-md border border-border bg-surface p-1 shadow-float"
        >
          {results.map((suggestion, index) => (
            <li
              key={suggestion.tmdb_id}
              id={`${listboxId}-${index}`}
              role="option"
              aria-label={`${suggestion.title}${suggestion.year === null ? '' : ` (${suggestion.year})`}`}
              aria-selected={index === active}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(suggestion)}
              className={`flex cursor-pointer items-center gap-3 rounded-sm p-2 text-left ${index === active ? 'bg-fill' : ''}`}
            >
              {suggestion.poster_url ? (
                <img
                  src={suggestion.poster_url}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-12 w-8 shrink-0 rounded-sm object-cover"
                />
              ) : (
                <span aria-hidden className="h-12 w-8 shrink-0 rounded-sm bg-fill" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text">
                  {suggestion.title}
                </span>
                {suggestion.year !== null && (
                  <span className="text-xs text-text-muted">{suggestion.year}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function createLookupSelection(kind: ItemKind, available: boolean, tmdbId?: number) {
  const lookup = (kind === 'movie' || kind === 'tv_show') && available
  return { lookup, ...(lookup && tmdbId !== undefined ? { tmdb_id: tmdbId } : {}) }
}
