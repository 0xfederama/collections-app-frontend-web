import { Select } from '../../components/ui'
import { switchDevUser } from '../../lib/devUser'

interface DevUserSwitcherProps {
  /** The signed-in e-mail: the current selection. */
  email: string
  /** `me.dev_identities`, non-empty (the caller checks). */
  identities: string[]
}

/**
 * Dev/test only (F-027 W7): pick one of the server's fake identities. Choosing one writes the
 * `dev_user` cookie and reloads. The caller renders it only when the server sends identities.
 */
export function DevUserSwitcher({ email, identities }: DevUserSwitcherProps) {
  return (
    <Select
      label="Signed in as (dev)"
      hint="Test users: this server runs with fake identities."
      value={email}
      onValueChange={(value) => {
        if (value !== email) switchDevUser(value)
      }}
      options={identities.map((identity) => ({ value: identity, label: identity }))}
    />
  )
}
