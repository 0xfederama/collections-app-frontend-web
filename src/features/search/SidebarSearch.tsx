import * as Popover from '@radix-ui/react-popover'
import { useEffect, useId, useState, type KeyboardEvent, type Ref } from 'react'
import { useNavigate } from 'react-router'
import { Button, TextField } from '../../components/ui'
import { Search } from '../../components/ui/icons'
import { cx } from '../../lib/cx'
import { normalizeQuery, useSearch, type SearchResult } from './api'
import { SearchResultBody, resultHref } from './SearchResultRow'

const DEBOUNCE_MS = 250
/** "Searching…" only appears if the answer takes longer than this, so fast replies never flash it. */
const LOADING_DELAY_MS = 150

/** `value`, but only after it has stayed the same for `ms`. */
function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

/** `true` once `active` has been true for `ms` without a break. */
function useDelayedFlag(active: boolean, ms: number) {
  const [elapsed, setElapsed] = useState(false)
  useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => setElapsed(true), ms)
    return () => {
      clearTimeout(timer)
      setElapsed(false)
    }
  }, [active, ms])
  return active && elapsed
}

/**
 * Global search field of the sidebar (UI_SPEC §6): after a 250 ms pause it shows the top 8
 * matches in a dropdown. It is an ARIA 1.2 combobox with a listbox popup; focus never leaves the
 * input, and `aria-activedescendant` points at the highlighted row.
 *
 * - ↑/↓ move the highlight (none at first), Enter on a highlighted row opens that item.
 * - Enter with no highlighted row goes to `/search?q=`; Esc closes the list and keeps the text.
 *
 * The `Combobox` primitive is not used: it filters a fixed option list on the client, always
 * highlights the first row and has no "Enter with nothing highlighted" action. This one is built
 * on the same Radix Popover.
 */
export function SidebarSearch({ inputRef }: { inputRef?: Ref<HTMLInputElement> }) {
  const id = useId()
  const listId = `${id}-listbox`
  const optionId = (index: number) => `${id}-option-${index}`
  const navigate = useNavigate()

  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const debounced = useDebounced(value, DEBOUNCE_MS)
  const query = useSearch(debounced)
  const typed = normalizeQuery(value)

  // While a newer query loads, the rows of the previous one stay (`placeholderData`).
  const results: SearchResult[] = typed && query.data ? query.data.data : []
  // Placeholder data, or a pause still running, means `query` is not about what is typed yet.
  const stale = query.isPlaceholderData || typed !== normalizeQuery(debounced)
  const loading =
    typed !== '' && !query.isError && results.length === 0 && (query.isPending || stale)
  const showLoading = useDelayedFlag(loading, LOADING_DELAY_MS)

  let body: 'results' | 'loading' | 'empty' | 'error' | null = null
  if (typed) {
    if (results.length > 0) body = 'results'
    else if (query.isError && !stale) body = 'error'
    else if (loading) body = showLoading ? 'loading' : null
    else if (query.isSuccess) body = 'empty'
  }
  const popupOpen = open && body !== null
  const activeIndex = popupOpen && body === 'results' ? Math.min(active, results.length - 1) : -1

  const close = () => {
    setOpen(false)
    setActive(-1)
  }
  const openResult = (result: SearchResult) => {
    close()
    void navigate(resultHref(result))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault()
        if (!popupOpen) {
          setOpen(true)
          break
        }
        // The highlight runs -1 (none) → 0 … n-1 → -1, so a plain Enter stays reachable.
        const next = activeIndex + (event.key === 'ArrowDown' ? 1 : -1)
        setActive(next < -1 ? results.length - 1 : next >= results.length ? -1 : next)
        break
      }
      case 'Enter': {
        const row = results[activeIndex]
        if (row) {
          event.preventDefault()
          openResult(row)
        }
        // Otherwise the form submits and goes to the results page.
        break
      }
      case 'Escape':
        if (popupOpen) {
          event.preventDefault()
          event.stopPropagation()
          close()
        }
        break
      case 'Tab':
        close()
        break
    }
  }

  // Announced politely when the list appears or changes.
  const announcement = !popupOpen
    ? ''
    : body === 'results'
      ? `${results.length} ${results.length === 1 ? 'result' : 'results'}, use up and down arrows to review`
      : body === 'empty'
        ? `No results for ${typed}`
        : body === 'error'
          ? 'Search failed'
          : 'Searching'

  return (
    <form
      role="search"
      aria-label="Search library"
      className="[&_label]:sr-only"
      onSubmit={(event) => {
        event.preventDefault()
        if (!typed) return
        close()
        void navigate(`/search?q=${encodeURIComponent(typed)}`)
      }}
    >
      <Popover.Root
        open={popupOpen}
        onOpenChange={(next) => {
          if (!next) close()
        }}
      >
        <Popover.Anchor asChild>
          <div>
            <TextField
              ref={inputRef}
              id={id}
              label="Search"
              type="search"
              role="combobox"
              aria-expanded={popupOpen}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
              placeholder="Search"
              autoComplete="off"
              spellCheck={false}
              value={value}
              onChange={(event) => {
                setValue(event.target.value)
                setActive(-1)
                setOpen(true)
              }}
              onKeyDown={onKeyDown}
              prefix={<Search aria-hidden className="size-4" />}
              suffix={
                <kbd aria-hidden className="rounded-sm border border-border px-1.5 text-xs">
                  /
                </kbd>
              }
            />
          </div>
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content
            align="start"
            aria-label="Search suggestions"
            sideOffset={4}
            // Focus stays in the input.
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={(event) => {
              if ((event.target as HTMLElement | null)?.id === id) event.preventDefault()
            }}
            className="z-50 max-h-(--radix-popover-content-available-height) w-[max(var(--radix-popover-trigger-width),18rem)] overflow-y-auto rounded-lg material-strong p-1 text-text shadow-float data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in"
          >
            <ul id={listId} role="listbox" aria-label="Search results">
              {results.map((result, index) => (
                <li
                  key={result.item.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  // Keep focus in the input when a row is pressed.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => setActive(index)}
                  onClick={() => openResult(result)}
                  className={cx(
                    'flex cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 pointer-coarse:min-h-11',
                    index === activeIndex && 'bg-accent/10',
                  )}
                >
                  <SearchResultBody result={result} />
                </li>
              ))}
            </ul>
            {body === 'loading' && <p className="px-3 py-2 text-sm text-text-muted">Searching…</p>}
            {body === 'empty' && (
              <p className="px-3 py-2 text-sm text-text-muted">No results for “{typed}”</p>
            )}
            {body === 'error' && (
              <div className="flex flex-col items-start gap-2 px-3 py-2">
                <p className="text-sm text-danger-text">Couldn’t search.</p>
                <Button
                  size="sm"
                  variant="secondary"
                  // Pressing it must not take focus out of the input.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void query.refetch()}
                >
                  Retry
                </Button>
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </form>
  )
}
