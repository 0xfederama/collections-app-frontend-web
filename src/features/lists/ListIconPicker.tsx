import { useMemo, useState } from 'react'
import { Button, Dialog, TextField } from '../../components/ui'
import { Search } from '../../components/ui/icons'
import { cx } from '../../lib/cx'
import {
  BUILTIN_LIST_ICONS,
  LIST_ICON_COLORS,
  searchListIcons,
  type IconChoice,
  type ListIconColor,
} from './iconModel'
import { EMOJI_KEYWORDS } from './emojiKeywords'
import { ListIconMark } from './ListIconMark'
import type { ItemType } from '../items'
const COLOR_LABELS: Record<ListIconColor, string> = {
  red: 'Red',
  orange: 'Orange',
  amber: 'Amber',
  green: 'Green',
  teal: 'Teal',
  blue: 'Blue',
  indigo: 'Indigo',
  purple: 'Purple',
  pink: 'Pink',
  gray: 'Gray',
}

const COLOR_SWATCH_CLASSES: Record<ListIconColor, string> = {
  red: 'bg-list-icon-red',
  orange: 'bg-list-icon-orange',
  amber: 'bg-list-icon-amber',
  green: 'bg-list-icon-green',
  teal: 'bg-list-icon-teal',
  blue: 'bg-list-icon-blue',
  indigo: 'bg-list-icon-indigo',
  purple: 'bg-list-icon-purple',
  pink: 'bg-list-icon-pink',
  gray: 'bg-list-icon-gray',
}

export function isSingleEmoji(value: string) {
  const normalized = value.trim()
  if (!normalized || !/(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|️|⃣)/u.test(normalized))
    return false
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  const segments = [...segmenter.segment(normalized)]
  return segments.length === 1 && segments[0]?.segment === normalized
}

export function ListIconPicker({
  value,
  onChange,
  onClose,
  title = 'Choose list icon',
  type = null,
  showColorControls = true,
}: {
  value: IconChoice
  onChange: (value: IconChoice) => void
  onClose: () => void
  title?: string
  type?: ItemType
  /** Type definitions store an icon only; their default icon cannot carry a list icon color. */
  showColorControls?: boolean
}) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [emojiDraft, setEmojiDraft] = useState('')
  const [emojiError, setEmojiError] = useState<string>()
  const hasQuery = query.trim() !== ''
  // Collapsed, the grids stay hidden until a search narrows them; the search field is the keyboard path.
  const showGrid = hasQuery || expanded
  const matches = useMemo(() => searchListIcons(query), [query])
  const selected = value.icon?.startsWith('i:') ? value.icon.slice(2) : null
  const currentLabel = selected
    ? (BUILTIN_LIST_ICONS.find((entry) => entry.key === selected)?.name ?? 'Built-in icon')
    : value.icon
      ? 'Emoji'
      : 'Default icon'
  const emojiSelected = value.icon && !value.icon.startsWith('i:') ? value.icon : null
  const chooseBuiltin = (key: string) => onChange({ icon: `i:${key}`, icon_color: null })

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={title}
      description="Search by icon or emoji name."
      className="max-w-2xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
        <TextField
          label="Search icons and emoji"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          prefix={<Search aria-hidden className="size-4" />}
          autoComplete="off"
        />
        <div className="flex flex-wrap items-center gap-3">
          <ListIconMark
            icon={value.icon}
            iconColor={value.icon_color}
            type={type}
            className="size-8"
            iconClassName="size-4"
          />
          <span className="text-ui text-text-muted">{currentLabel}</span>
          {showColorControls && selected ? (
            <div role="group" aria-label="Icon color" className="flex flex-wrap items-center gap-2">
              <span className="text-ui text-text-muted">Color</span>
              <button
                type="button"
                aria-label="None"
                aria-pressed={!value.icon_color}
                onClick={() => onChange({ ...value, icon_color: null })}
                className="size-8 pointer-coarse:size-11 rounded-md border border-border bg-surface text-secondary text-text-muted aria-pressed:outline-2 aria-pressed:outline-focus-ring focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:-outline-offset-2"
              >
                —
              </button>
              {LIST_ICON_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={COLOR_LABELS[color]}
                  aria-pressed={value.icon_color === color}
                  onClick={() => onChange({ icon: value.icon, icon_color: color })}
                  className={cx(
                    'size-8 pointer-coarse:size-11 rounded-md border border-border aria-pressed:outline-2 aria-pressed:outline-focus-ring focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:-outline-offset-2',
                    COLOR_SWATCH_CLASSES[color],
                  )}
                />
              ))}
            </div>
          ) : (
            showColorControls && (
              <p className="text-ui text-text-muted">Colors apply to built-in icons.</p>
            )
          )}
          <Button
            variant="secondary"
            className="ml-auto"
            onClick={() => onChange({ icon: null, icon_color: null })}
          >
            Use default
          </Button>
        </div>
        {!hasQuery && (
          <div>
            <Button
              variant="secondary"
              size="sm"
              aria-expanded={expanded}
              onClick={() => setExpanded((open) => !open)}
            >
              Show all icons
            </Button>
          </div>
        )}
        {showGrid ? (
          <>
            <section aria-label="Built-in icons">
              <h3 className="mb-2 text-ui font-medium">Icons</h3>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {matches.builtins.map(({ key, name, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={name}
                    aria-pressed={selected === key}
                    onClick={() => chooseBuiltin(key)}
                    className={cx(
                      'grid size-10 pointer-coarse:size-11 place-items-center rounded-md border border-border bg-fill text-text-muted hover:bg-fill-hover aria-pressed:border-accent aria-pressed:text-accent-text focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:-outline-offset-2',
                    )}
                  >
                    <Icon aria-hidden className="size-5" />
                  </button>
                ))}
              </div>
              {matches.builtins.length === 0 && (
                <p className="mt-2 text-ui text-text-muted">No matching icons.</p>
              )}
            </section>
            <section aria-label="Emoji">
              <h3 className="mb-2 text-ui font-medium">Emoji</h3>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {matches.emoji.map(([emoji, keywords]) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={`${emoji} ${keywords.split(' ')[0]}`}
                    aria-pressed={emojiSelected === emoji}
                    onClick={() => onChange({ icon: emoji, icon_color: null })}
                    className={cx(
                      'grid size-10 pointer-coarse:size-11 place-items-center rounded-md border border-border bg-fill text-section hover:bg-fill-hover aria-pressed:border-accent focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:-outline-offset-2',
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {matches.emoji.length === 0 && (
                <p className="mt-2 text-ui text-text-muted">No matching emoji.</p>
              )}
            </section>
          </>
        ) : (
          <p className="text-ui text-text-muted">
            Type to search icons and emoji, or show all icons.
          </p>
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const emoji = emojiDraft.trim()
            if (!isSingleEmoji(emoji)) {
              setEmojiError('Enter one emoji.')
              return
            }
            setEmojiError(undefined)
            onChange({ icon: emoji, icon_color: null })
            setEmojiDraft('')
          }}
        >
          <TextField
            label="Use an emoji"
            hint="Paste or type one emoji."
            value={emojiDraft}
            onChange={(event) => {
              setEmojiDraft(event.target.value)
              setEmojiError(undefined)
            }}
            error={emojiError}
            className="max-w-48"
          />
          <Button type="submit" variant="secondary">
            Use emoji
          </Button>
        </form>
        <span className="sr-only">
          {BUILTIN_LIST_ICONS.length} built-in icons and {EMOJI_KEYWORDS.length} named emoji
        </span>
      </div>
    </Dialog>
  )
}
