import ActivityItem from './ActivityItem'

const activity = [
  { title: 'Nora followed you', detail: 'Frontend engineer at Loomline', action: 'Follow back' },
  { title: 'Mina liked your post', detail: 'Your update on onboarding was saved to 12 collections' },
]

export default function ActivityFeed() {
  return (
    <section className="panel stack">
      <h3>Activity</h3>
      <ul className="activity-feed">
        {activity.map((item) => (
          <ActivityItem key={item.title} activity={item} />
        ))}
      </ul>
    </section>
  )
}
