import Avatar from '../ui/Avatar'
import Button from '../ui/Button'
import VerifiedBadge from '../ui/VerifiedBadge'
import { formatCount } from '../../lib/utils'

export default function ProfileCard({ user }) {
  return (
    <article className="panel profile-card">
      <div className="profile-card__header">
        <Avatar name={user.name} size={72} />
        <div>
          <div className="profile-card__name-row">
            <h2>{user.name}</h2>
            <VerifiedBadge />
          </div>
          <p className="muted">@{user.username}</p>
        </div>
      </div>
      <p>{user.bio}</p>
      <div className="profile-card__stats">
        <div><strong>{formatCount(user.followers)}</strong><span>Followers</span></div>
        <div><strong>{formatCount(user.following)}</strong><span>Following</span></div>
      </div>
      <Button type="button">Edit profile</Button>
    </article>
  )
}
