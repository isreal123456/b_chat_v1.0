import Avatar from '../ui/Avatar'
import Button from '../ui/Button'

export default function PostComposer({ user }) {
  return (
    <section className="panel composer">
      <Avatar name={user.name} size={52} />
      <label className="composer__input">
        <span>Tell your friends what you’re working on...</span>
        <textarea rows="3" placeholder="Share a progress update, question, or win." />
      </label>
      <Button type="button">Post update</Button>
    </section>
  )
}
