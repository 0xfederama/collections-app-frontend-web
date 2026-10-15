import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useState } from 'react'
import { AlertDialog, kindLabels, useToast, type ItemKind } from '../../components/ui'
import { Check, ChevronDown } from '../../components/ui/icons'
import type { List as TreeList } from '../tree/api'
import { classifyError } from '../tree/errors'
import { useUpdateList } from '../tree/mutations'

const kinds = Object.keys(kindLabels) as ItemKind[]

const itemClass =
  'flex h-9 cursor-pointer items-center gap-2 rounded-md px-3 text-sm outline-none select-none data-[highlighted]:bg-accent/10 pointer-coarse:min-h-11'

/**
 * The list's kind as a chip next to its title. Click it to pick another kind. A change on a list
 * with items first asks for confirmation: it permanently clears the kind fields of every item in
 * the list, trashed ones too. The server does the clearing; nothing is cleared here.
 */
export function KindChip({ list }: { list: TreeList }) {
  const toast = useToast()
  const update = useUpdateList()
  const [target, setTarget] = useState<ItemKind | null>(null)
  const [error, setError] = useState<string | null>(null)

  const change = async (kind: ItemKind) => {
    setError(null)
    try {
      await update.mutateAsync({ list, patch: { kind } })
      toast({ kind: 'success', title: `Kind changed to ${kindLabels[kind]}` })
      setTarget(null)
    } catch (caught) {
      const failure = classifyError(caught, 'list')
      // With the dialog closed (no items) the toast is the only place to say it.
      if (target) setError(failure.message)
      else toast({ kind: 'error', title: 'Couldn’t change the kind', description: failure.message })
    }
  }

  const pick = (kind: ItemKind) => {
    if (kind === list.kind) return
    if (list.item_count > 0) {
      setError(null)
      setTarget(kind)
    } else void change(kind)
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={`Kind: ${kindLabels[list.kind]}. Change kind`}
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-border bg-fill px-3 text-xs font-semibold text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring pointer-coarse:h-11"
          >
            {kindLabels[list.kind]}
            <ChevronDown aria-hidden className="size-3.5" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="material-strong z-50 min-w-48 rounded-lg p-1.5 text-text shadow-float data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in"
          >
            <DropdownMenu.RadioGroup
              value={list.kind}
              onValueChange={(value) => pick(value as ItemKind)}
            >
              {kinds.map((kind) => (
                <DropdownMenu.RadioItem key={kind} value={kind} className={itemClass}>
                  <span aria-hidden className="grid size-4 shrink-0 place-items-center">
                    <DropdownMenu.ItemIndicator>
                      <Check className="size-4" />
                    </DropdownMenu.ItemIndicator>
                  </span>
                  {kindLabels[kind]}
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {target && (
        <AlertDialog
          open
          onOpenChange={(open) => !open && !update.isPending && setTarget(null)}
          title={`Change ${list.name} to ${kindLabels[target]}?`}
          description={`This permanently clears the ${kindLabels[list.kind]} details of all ${list.item_count} ${list.item_count === 1 ? 'item' : 'items'} in this list, trashed ones included. There is no undo. Titles, images, descriptions and history stay.`}
          confirmLabel="Clear details and change"
          destructive
          keepOpen
          pending={update.isPending}
          onConfirm={() => void change(target)}
        >
          {error && (
            <p
              role="alert"
              className="rounded-md border border-danger-border bg-danger-bg p-3 text-sm text-danger-text"
            >
              {error}
            </p>
          )}
        </AlertDialog>
      )}
    </>
  )
}
