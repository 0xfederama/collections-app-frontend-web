import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button, Dialog, TextField } from '../../components/ui'
import { ApiError, NetworkError } from '../../lib/api'
import { useCreateItem } from './api'
import { withEdit } from './editMode'
import { LIMITS } from './form/draft'

/**
 * "Add item" (UI_SPEC §5): a title. The new item opens in edit mode
 * (`/lists/:listId/items/:id?edit=1`) so the rest of the details are one step away.
 * `search` is the list's own query (`?q=`, `?sort=`), which the item page keeps.
 */
export function CreateItemDialog({
  listId,
  search,
  onClose,
}: {
  listId: string
  search: string
  onClose: () => void
}) {
  const create = useCreateItem(listId)
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [titleError, setTitleError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const titleRef = useRef<HTMLInputElement>(null)

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    const trimmed = title.trim()
    setFormError(undefined)
    if (!trimmed) return setTitleError('Enter a title.')
    if (trimmed.length > LIMITS.title) {
      return setTitleError(`Use at most ${LIMITS.title} characters.`)
    }
    setTitleError(undefined)
    try {
      const created = await create.mutateAsync({ title: trimmed })
      onClose()
      void navigate({
        pathname: `/lists/${listId}/items/${created.id}`,
        search: withEdit(search),
      })
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 422) {
        const onTitle = caught.errors?.find((e) => e.field === 'title')
        if (onTitle) return setTitleError(onTitle.message)
        setFormError(caught.errors?.map((e) => e.message).join(' ') || caught.title)
      } else if (caught instanceof ApiError && caught.status === 409) {
        setFormError('This list no longer exists or is in Trash.')
      } else if (
        caught instanceof NetworkError ||
        (caught instanceof ApiError && caught.status >= 500)
      ) {
        setFormError('The server could not be reached. Nothing was created, so you can try again.')
      } else {
        setFormError(
          caught instanceof ApiError ? (caught.detail ?? caught.title) : 'Something went wrong.',
        )
      }
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Add item"
      description="Give it a title now; you can fill in the details next."
      initialFocus={titleRef}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-item-form" pending={create.isPending}>
            Create item
          </Button>
        </>
      }
    >
      <form
        id="create-item-form"
        onSubmit={(event) => void submit(event)}
        noValidate
        className="flex flex-col gap-4"
      >
        <TextField
          ref={titleRef}
          label="Title"
          required
          autoComplete="off"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            setTitleError(undefined)
          }}
          error={titleError}
        />
        {formError && (
          <div
            role="alert"
            className="rounded-md border border-danger-border bg-danger-bg p-3 text-sm text-danger-text"
          >
            {formError}
          </div>
        )}
      </form>
    </Dialog>
  )
}
