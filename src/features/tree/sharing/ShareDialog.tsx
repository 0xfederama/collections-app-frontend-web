import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type FormEvent } from 'react'
import { AlertDialog, Button, Dialog, TextField, useToast } from '../../../components/ui'
import { accountKeys } from '../../../data/keys'
import { userLabel, type Me, type User } from '../../account'
import type { Folder } from '../api'
import type { TreeError } from '../errors'
import { FormError } from '../FormError'
import { OWN_EMAIL_MESSAGE, sameEmail, sharingFailure } from './messages'
import { useRemoveFolderMember, useShareFolder } from './mutations'
import { PeopleList } from './PeopleList'
import { peopleWithAccess, UNKNOWN_PERSON, type Person } from './people'
import { folderRights } from './rights'

const validation = (message: string): TreeError => ({
  kind: 'validation',
  message,
  fieldErrors: [],
})

/**
 * Who can see a top-level folder. The owner adds people by email, removes them and stops sharing;
 * a member sees the same list read-only. Failures show inside the dialog and keep the typed email.
 */
export function ShareDialog({
  folder,
  me,
  users,
  onClose,
  onGone,
}: {
  folder: Folder
  me: Me
  users: readonly User[] | undefined
  onClose: () => void
  /** The folder no longer exists (404). */
  onGone: () => void
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const share = useShareFolder()
  const remove = useRemoveFolderMember()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<TreeError | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const retry = useRef<() => void>(() => undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  const owner = folderRights(folder, me.id).canShare
  const people = peopleWithAccess(folder, users)
  const members = people.filter((person) => !person.isOwner)

  const fail = (caught: unknown, typedEmail?: string) => {
    const failure = sharingFailure(caught, {
      folderName: folder.name,
      typedEmail,
      meEmail: me.email,
    })
    if (failure) setError(failure)
    else onGone()
  }
  const run = async (action: () => Promise<void>, typedEmail?: string) => {
    setBusy(true)
    setError(null)
    retry.current = () => void run(action, typedEmail)
    try {
      await action()
    } catch (caught) {
      fail(caught, typedEmail)
    } finally {
      setBusy(false)
    }
  }

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    const value = email.trim()
    if (!value) return setError(validation('Enter an email.'))
    if (sameEmail(value, me.email)) return setError(validation(OWN_EMAIL_MESSAGE))
    void run(async () => {
      await share.mutateAsync({ folderId: folder.id, email: value })
      void queryClient.invalidateQueries({ queryKey: accountKeys.users })
      const known = users?.find((user) => sameEmail(user.email, value))
      toast({ kind: 'success', title: `Shared with ${known ? userLabel(known) : value}` })
      setEmail('')
    }, value)
  }

  const removeOne = (person: Person) =>
    void run(async () => {
      await remove.mutateAsync({ folderId: folder.id, userId: person.id })
      toast({ kind: 'success', title: `Removed ${person.label}` })
    })

  const stopSharing = async () => {
    setConfirming(false)
    setBusy(true)
    setError(null)
    // Members are recomputed from the refetched tree, so a retry opens the confirm again.
    retry.current = () => setConfirming(true)
    try {
      for (const person of members) {
        await remove.mutateAsync({ folderId: folder.id, userId: person.id })
      }
      toast({ kind: 'success', title: `Stopped sharing ‘${folder.name}’` })
      onClose()
    } catch (caught) {
      const failure = sharingFailure(caught, { folderName: folder.name, meEmail: me.email })
      // Some members may already be gone: the tree is refetched and the list shows who is left.
      if (failure)
        setError({
          ...failure,
          message: `Couldn’t remove everyone. ${failure.message} The list shows who still has access.`,
        })
      else onGone()
    } finally {
      setBusy(false)
    }
  }

  const count = members.length
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={owner ? `Share ‘${folder.name}’` : `People in ‘${folder.name}’`}
      description={
        owner
          ? 'People you share it with see everything in it and can add to it.'
          : `Shared with you by ${people[0]?.label ?? UNKNOWN_PERSON}.`
      }
      initialFocus={owner ? inputRef : undefined}
      footer={
        owner && count > 0 ? (
          <Button variant="danger" disabled={busy} onClick={() => setConfirming(true)}>
            Stop sharing
          </Button>
        ) : undefined
      }
    >
      {owner && (
        <form onSubmit={submit} noValidate className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <TextField
              ref={inputRef}
              type="email"
              label="Email"
              placeholder="name@example.com"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <Button type="submit" pending={busy}>
            Share
          </Button>
        </form>
      )}
      {error && <FormError error={error} pending={busy} onRetry={() => retry.current()} />}
      <PeopleList people={people} onRemove={owner ? removeOne : undefined} disabled={busy} />
      <AlertDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Stop sharing ‘${folder.name}’?`}
        description={`${count === 1 ? '1 person loses' : `${count} people lose`} access to it. Everything in it stays in your folder.`}
        confirmLabel="Stop sharing"
        destructive
        onConfirm={() => void stopSharing()}
      />
    </Dialog>
  )
}
