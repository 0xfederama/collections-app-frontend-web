import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertDialog, Button, Dialog, useToast } from '../../components/ui'
import { api, unwrap } from '../../lib/api'
import { builtinListIcon, parseListIcon } from '../lists/iconModel'
import type { IconChoice, ListIconColor } from '../lists/iconModel'
import { ListIconPicker } from '../lists/ListIconPicker'
import { ListIconMark } from '../lists/ListIconMark'
import { useUpdateListIcon } from './mutations'
import { treeKeys, type List } from './api'
import { FormError } from './FormError'
import { useAction } from './useAction'
import { useKinds } from '../settings/api'

const COLOR_LABELS: Record<Exclude<ListIconColor, null>, string> = {
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

export function ListIconDialog({
  list: initialList,
  onClose,
}: {
  list: List
  onClose: () => void
}) {
  const [snapshot, setSnapshot] = useState(initialList)
  const [choice, setChoice] = useState<IconChoice>({
    icon: initialList.icon,
    icon_color: initialList.icon_color,
  })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmReload, setConfirmReload] = useState(false)
  const [copyFallback, setCopyFallback] = useState<string | null>(null)
  const [reloading, setReloading] = useState(false)
  const [reloadFailed, setReloadFailed] = useState(false)
  const copyRef = useRef<HTMLTextAreaElement>(null)
  const update = useUpdateListIcon()
  const queryClient = useQueryClient()
  const action = useAction('list')
  const toast = useToast()
  const definitions = useKinds()
  const definition = definitions.data?.find((kind) => kind.key === snapshot.kind)

  const reload = async () => {
    setReloading(true)
    setReloadFailed(false)
    try {
      const latest = await unwrap(
        api.GET('/api/v1/lists/{id}', {
          params: { path: { id: snapshot.id } },
        }),
      )
      setSnapshot(latest)
      setChoice({ icon: latest.icon, icon_color: latest.icon_color })
      void queryClient.invalidateQueries({ queryKey: treeKeys.tree })
      action.clearError()
      setConfirmReload(false)
    } catch {
      setReloadFailed(true)
      setConfirmReload(false)
    } finally {
      setReloading(false)
    }
  }

  const parsedChoice = parseListIcon(choice.icon)
  const choiceLabel = parsedChoice.builtin
    ? (builtinListIcon(parsedChoice.builtin)?.name ?? 'Built-in icon')
    : parsedChoice.emoji
      ? `Emoji ${parsedChoice.emoji}`
      : `Default ${definition?.name ?? snapshot.kind.replaceAll('_', ' ')} icon`
  const draftText = `Icon: ${choiceLabel}\nColor: ${choice.icon_color ? COLOR_LABELS[choice.icon_color] : 'None'}`

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draftText)
      toast({ kind: 'success', title: 'Draft copied to the clipboard' })
    } catch {
      setCopyFallback(draftText)
    }
  }

  const save = async () => {
    if (await action.run(() => update.mutateAsync({ list: snapshot, icon: choice }))) onClose()
  }

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => !open && onClose()}
        title={`List icon · ${snapshot.name}`}
        description="Choose the mark shown beside this list throughout the app."
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button pending={action.pending} onClick={() => void save()}>
              Save
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setPickerOpen(true)}>
              Choose icon
            </Button>
            <ListIconMark
              icon={choice.icon ?? definition?.default_icon}
              iconColor={choice.icon_color}
              kind={snapshot.kind}
              className="size-9"
              iconClassName="size-5"
            />
            <span className="text-sm text-text-muted">{choiceLabel}</span>
          </div>
          {action.error && (
            <FormError
              error={action.error}
              pending={action.pending}
              onReload={action.error.kind === 'conflict' ? () => setConfirmReload(true) : undefined}
              onRetry={action.error.kind === 'network' ? () => void save() : undefined}
            />
          )}
          {action.error?.kind === 'conflict' && (
            <>
              {reloadFailed && (
                <p role="status">
                  The latest list could not be loaded. Your draft is still here; try again.
                </p>
              )}
              <Button size="sm" variant="secondary" onClick={() => void copyDraft()}>
                Copy my draft
              </Button>
            </>
          )}
          {reloading && (
            <p role="status" className="text-sm text-text-muted">
              Loading latest list…
            </p>
          )}
        </div>
      </Dialog>
      {confirmReload && (
        <AlertDialog
          open
          title="Replace your unsaved changes with the latest list icon?"
          description="Your icon and color choices will be discarded. Copy your draft first if you want to keep them."
          confirmLabel="Reload latest"
          cancelLabel="Keep my draft"
          keepOpen
          pending={reloading}
          onOpenChange={(open) => !open && setConfirmReload(false)}
          onConfirm={() => void reload()}
        />
      )}
      {copyFallback !== null && (
        <Dialog
          open
          onOpenChange={(open) => !open && setCopyFallback(null)}
          title="Copy your draft"
          description="Your browser would not copy it for you. Select the text below and copy it."
          initialFocus={copyRef}
          footer={<Button onClick={() => setCopyFallback(null)}>Done</Button>}
        >
          <textarea
            ref={copyRef}
            readOnly
            aria-label="Your draft"
            value={copyFallback}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-sm border border-border-strong bg-surface p-3 font-mono text-sm text-text"
          />
        </Dialog>
      )}
      {pickerOpen && (
        <ListIconPicker
          value={choice}
          kind={snapshot.kind}
          onChange={setChoice}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  )
}
