import { UserAvatar } from '../../components/UserAvatar'
import { Row, Section } from './shared'

export function UserAvatarSection() {
  return (
    <Section id="user-avatar" title="User avatar">
      <Row label="Letter tile (no URL), name or e-mail">
        <UserAvatar name="Ada Lovelace" size={24} />
        <UserAvatar name="Ada Lovelace" size={40} />
        <UserAvatar email="grace@example.com" size={48} />
        <UserAvatar size={32} />
      </Row>
      <Row label="Not https and broken URL fall back to the tile">
        <UserAvatar name="Http" avatarUrl="http://example.com/a.png" size={40} />
        <UserAvatar name="Broken" avatarUrl="https://invalid.invalid/a.png" size={40} />
      </Row>
    </Section>
  )
}
