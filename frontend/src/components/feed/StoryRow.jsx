import Avatar from '../ui/Avatar'

export default function StoryRow() {
  const stories = ['Ari', 'Noah', 'Mina', 'Kai', 'Lena']

  return (
    <section className="story-row panel">
      {stories.map((story) => (
        <button key={story} type="button" className="story-row__item">
          <Avatar name={story} size={52} />
          <span>{story}</span>
        </button>
      ))}
    </section>
  )
}
