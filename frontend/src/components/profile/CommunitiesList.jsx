export default function CommunitiesList({ communities = [] }) {
  return (
    <section className="panel stack">
      <h3>Communities</h3>
      <ul className="list">
        {communities.map((community) => (
          <li key={community.name}>
            <strong>{community.name}</strong>
            <span>{community.members} members</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
