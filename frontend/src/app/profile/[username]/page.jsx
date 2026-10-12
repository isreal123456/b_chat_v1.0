import ProfileCard from '../../../components/profile/ProfileCard'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, fetchProfile } from '../../../lib/api'
import TopNav from '../../../components/ui/navbar'

export default function ProfilePage() {
  const { username = 'user' } = useParams()
  const [profile, setProfile] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [requestSent, setRequestSent] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchProfile(username), api('/users/me')])
      .then(([user, loggedInUser]) => {
        setProfile({
          ...user,
        })
        setCurrentUser(loggedInUser)
      })
      .catch((requestError) => { setProfile(null); setError(requestError.message || 'Could not load profile.') })
      .finally(() => setLoading(false))
  }, [username])

  const handleFriendRequest = async () => {
    try {
      await api(`/friends/requests/${profile.id}`, { method: 'POST' })
      setRequestSent(true)
      setError('')
    } catch (requestError) { setError(requestError.message || 'Could not send friend request.') }
  }

  if (loading) return <><TopNav /><main className="page-frame"><p className="muted" role="status">Loading profile…</p></main></>
  if (!profile) return <><TopNav /><main className="page-frame"><p className="muted" role="alert">{error || 'Profile not found.'}</p></main></>

  return (
    <><TopNav />{error && <p className="page-frame muted" role="alert">{error}</p>}<main className="page-frame">
      <ProfileCard
        user={profile}
        isOwnProfile={currentUser?.id === profile.id}
        requestSent={requestSent}
        onFriendRequest={handleFriendRequest}
      />
    </main></>
  )
}
