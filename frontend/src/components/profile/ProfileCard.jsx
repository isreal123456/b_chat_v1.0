import Avatar from '../ui/Avatar'
import Button from '../ui/Button'
import { UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getMediaUrl } from '../../lib/api'

export default function ProfileCard({ user, isOwnProfile, requestSent, onFriendRequest }) {
  return (
    <article className="panel profile-card">
      <div className="profile-card__header">
        <Avatar name={user.name} src={user.avatar_url ? getMediaUrl(user.avatar_url) : undefined} size={72} />
        <div>
          <div className="profile-card__name-row">
            <h2>{user.name}</h2>
          </div>
          <p className="muted">@{user.username}</p>
        </div>
      </div>
      {user.bio && <p>{user.bio}</p>}
      {isOwnProfile ? (
        <Link className="button" to="/settings">Edit profile</Link>
      ) : (
        <Button type="button" onClick={onFriendRequest} disabled={requestSent}>
          <UserPlus size={16} />
          {requestSent ? 'Request Sent' : 'Friend Request'}
        </Button>
      )}
    </article>
  )
}
