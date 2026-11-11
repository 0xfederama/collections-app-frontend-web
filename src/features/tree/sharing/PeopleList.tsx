import { Button } from '../../../components/ui'
import { UserAvatar } from '../../../components/UserAvatar'
import type { Person } from './people'

/** Everyone with access to a folder. `onRemove` (owner only) adds a Remove button on each member. */
export function PeopleList({
  people,
  onRemove,
  disabled,
}: {
  people: Person[]
  onRemove?: (person: Person) => void
  disabled?: boolean
}) {
  return (
    <ul aria-label="People with access" className="flex flex-col gap-2">
      {people.map((person) => (
        <li key={person.id} className="flex items-center gap-3">
          <UserAvatar
            name={person.user?.name}
            email={person.user?.email}
            avatarUrl={person.user?.avatar_url}
            size={32}
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-ui font-medium">{person.label}</span>
            {person.user && person.user.email !== person.label && (
              <span className="truncate text-secondary text-text-muted">{person.user.email}</span>
            )}
          </span>
          {person.isOwner ? (
            <span className="text-secondary text-text-muted">Owner</span>
          ) : (
            onRemove && (
              <Button
                size="sm"
                variant="secondary"
                disabled={disabled}
                aria-label={`Remove ${person.label}`}
                onClick={() => onRemove(person)}
              >
                Remove
              </Button>
            )
          )}
        </li>
      ))}
    </ul>
  )
}
