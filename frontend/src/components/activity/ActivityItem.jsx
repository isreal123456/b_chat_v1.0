import Button from '../ui/Button'

export default function ActivityItem({ activity }) {
  return (
    <li className="activity-item">
      <div>
        <strong>{activity.title}</strong>
        <p className="muted">{activity.detail}</p>
      </div>
      {activity.action ? <Button type="button" variant="ghost">{activity.action}</Button> : null}
    </li>
  )
}
