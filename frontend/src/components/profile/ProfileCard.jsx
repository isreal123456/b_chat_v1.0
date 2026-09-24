import Avatar from '../ui/Avatar'
import Button from '../ui/Button'
import VerifiedBadge from '../ui/VerifiedBadge'
import { formatCount } from '../../lib/utils'
import { UserPlus } from 'lucide-react'

export default function ProfileCard({ user, isOwnProfile, requestSent, onFriendRequest }) {
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
      {isOwnProfile ? (
        <Button type="button">Edit profile</Button>
      ) : (
        <Button type="button" onClick={onFriendRequest} disabled={requestSent}>
          <UserPlus size={16} />
          {requestSent ? 'Request Sent' : 'Friend Request'}
        </Button>
      )}
    </article>
  )
}
