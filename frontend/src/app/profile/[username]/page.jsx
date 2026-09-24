import ProfileCard from '../../../components/profile/ProfileCard'
import SkillsList from '../../../components/profile/SkillsList'
import CommunitiesList from '../../../components/profile/CommunitiesList'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, fetchProfile } from '../../../lib/api'

export default function ProfilePage() {
  const { username = 'user' } = useParams()
  const [profile, setProfile] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [requestSent, setRequestSent] = useState(false)

  useEffect(() => {
    Promise.all([fetchProfile(username), api('/users/me')])
      .then(([user, loggedInUser]) => {
        setProfile({
          ...user,
          bio: user.bio || 'Connect with this member and start a conversation.',
          followers: user.followers || 0,
          following: user.following || 0,
        })
        setCurrentUser(loggedInUser)
      })
      .catch(() => setProfile(null))
  }, [username])

  const handleFriendRequest = async () => {
    await api(`/friends/requests/${profile.id}`, { method: 'POST' })
    setRequestSent(true)
  }

  if (!profile) {
    return <main className="page-frame"><p className="muted">Profile not found.</p></main>
  }

  return (
    <main className="page-frame">
      <ProfileCard
        user={profile}
        isOwnProfile={currentUser?.id === profile.id}
        requestSent={requestSent}
        onFriendRequest={handleFriendRequest}
      />
      <SkillsList skills={['Frontend', 'Accessibility', 'Design Systems', 'Writing']} />
      <CommunitiesList
        communities={[
          { name: 'Creators of Bchat', members: '1.8k' },
          { name: 'React Builders', members: '9.6k' },
        ]}
      />
    </main>
  )
}
