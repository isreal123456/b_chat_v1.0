import ProfileCard from '../../../components/profile/ProfileCard'
import SkillsList from '../../../components/profile/SkillsList'
import CommunitiesList from '../../../components/profile/CommunitiesList'

export default function ProfilePage({ params }) {
  const username = params?.username || 'user'

  const profile = {
    name: 'Maya Chen',
    username,
    bio: 'Shipping thoughtful product experiences and sharing the process along the way.',
    followers: 18420,
    following: 812,
  }

  return (
    <main className="page-frame">
      <ProfileCard user={profile} />
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
