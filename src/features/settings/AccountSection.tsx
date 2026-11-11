import { Button, Skeleton } from '../../components/ui'
import { UserAvatar } from '../../components/UserAvatar'
import { useMe, userLabel } from '../account'
import { DevUserSwitcher } from './DevUserSwitcher'

const externalLink =
  'text-accent underline decoration-border-strong underline-offset-4 hover:text-accent-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring'

/** Who is signed in, and the way out (Cloudflare Access ends the session at its own URL). */
export function AccountSection() {
  const me = useMe()
  if (me.isPending) {
    return (
      <div role="status" className="flex items-center gap-3">
        <span className="sr-only">Loading account</span>
        <Skeleton className="size-12 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    )
  }
  if (me.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2">
        <p>Couldn’t load your account.</p>
        <Button variant="secondary" onClick={() => void me.refetch()}>
          Retry
        </Button>
      </div>
    )
  }
  const { name, email, avatar_url, dev_identities, identity_source } = me.data
  return (
    <div className="flex flex-col gap-4 text-ui">
      <div className="flex items-center gap-3">
        <UserAvatar name={name} email={email} avatarUrl={avatar_url} size={48} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{userLabel(me.data)}</span>
          {name?.trim() ? <span className="truncate text-text-muted">{email}</span> : null}
        </div>
      </div>
      {/* Only an Access session can be logged out of: the home network is always the owner (D-150) and dev/test
          servers use fake identities, so neither gets a Log out. */}
      {identity_source === 'access' ? (
        <a className={`${externalLink} self-start`} href="/cdn-cgi/access/logout">
          Log out
        </a>
      ) : null}
      {/* Only servers with fake identities send them, so the switcher never shows in prod (F-027 W7). */}
      {dev_identities !== null && dev_identities.length > 0 ? (
        <DevUserSwitcher email={email} identities={dev_identities} />
      ) : null}
    </div>
  )
}
