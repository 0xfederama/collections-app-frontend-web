import { useState, type FormEvent } from 'react'
import { Button, Dialog, TextField } from '../../../components/ui'
import { ListIconMark, type IconChoice } from '../../lists'
import { useCreateType } from '../api'
import { errorText } from './model'

export function CreateTypeDialog({
  onClose,
  onCreated,
  icon,
  onPickIcon,
}: {
  onClose: () => void
  onCreated: (key: string) => void
  icon: IconChoice
  onPickIcon: () => void
}) {
  const createType = useCreateType()
  const [createError, setCreateError] = useState<unknown>(null)
  const [name, setName] = useState('')
  const [allowsPrice, setAllowsPrice] = useState(false)

  const submitType = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const created = await createType
      .mutateAsync({
        name: trimmed,
        ...(icon.icon ? { default_icon: icon.icon } : {}),
        allows_price: allowsPrice,
      })
      .catch((error: unknown) => {
        setCreateError(error)
        return null
      })
    if (created) {
      setName('')
      setAllowsPrice(false)
      setCreateError(null)
      onCreated(created.key)
      onClose()
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && !createType.isPending && onClose()}
      title="New type"
      description="Create the type first, then add its fields and set the default sort and pins in its details."
    >
      <form onSubmit={(event) => void submitType(event)} className="flex flex-col gap-3">
        <TextField
          label="Type name"
          placeholder="Board games"
          hint="Suggest a plural name, like Board games. It is kept as you type it."
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
        />
        <label className="flex min-h-10 items-center gap-3 text-ui">
          <input
            type="checkbox"
            checked={allowsPrice}
            onChange={(event) => setAllowsPrice(event.target.checked)}
          />{' '}
          Allows a price
        </label>
        {createError !== null && (
          <p role="alert" className="text-ui text-danger-text">
            {errorText(createError)}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onPickIcon}>
            {icon.icon ? (
              <>
                <ListIconMark icon={icon.icon} className="size-5" iconClassName="size-3" />
                Change icon
              </>
            ) : (
              'Choose icon'
            )}
          </Button>
          <Button type="submit" pending={createType.isPending} disabled={!name.trim()}>
            Create type
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
