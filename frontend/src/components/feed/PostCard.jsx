import Avatar from '../ui/Avatar'
import Button from '../ui/Button'
import Tag from '../ui/Tag'
import { formatCount } from '../../lib/utils'

export default function PostCard({ post }) {
  return (
    <article className="panel post-card">
      <header className="post-card__header">
        <Avatar name={post.author} size={44} />
        <div>
          <strong>{post.author}</strong>
          <p className="muted">
            {post.handle} · {post.time}
          </p>
        </div>
      </header>
      <p>{post.body}</p>
      <div className="tag-list">
        {post.tags.map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>
      <footer className="post-card__footer">
        <Button type="button" variant="ghost">{formatCount(post.likes)} Likes</Button>
        <Button type="button" variant="ghost">{formatCount(post.comments)} Comments</Button>
        <Button type="button" variant="ghost">{formatCount(post.shares)} Shares</Button>
      </footer>
    </article>
  )
}
