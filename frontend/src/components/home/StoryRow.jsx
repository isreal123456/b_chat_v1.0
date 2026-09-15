export default function StoryRow({ stories }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-1">
      {stories.map((story) => (
        <div key={story.id} className="flex flex-col items-center gap-1 shrink-0">
          <div className="w-16 h-16 rounded-xl p-0.5 border-2 border-yellow-400">
            <img
              src={story.avatar}
              alt={story.name}
              className="w-full h-full rounded-lg object-cover"
            />
          </div>
          <span className="text-xs text-neutral-400">{story.name}</span>
        </div>
      ))}
    </div>
  );
}
