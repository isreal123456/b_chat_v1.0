export default function ActivityCard({ activity }) {
  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-5">
      <h3 className="text-white font-semibold mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activity.map((a) => (
          <div key={a.id} className="flex items-start gap-3">
            <img src={a.avatar} alt={a.name} className="w-9 h-9 rounded-lg object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{a.name}</p>
              <p className="text-neutral-500 text-xs mb-2">
                {a.action} · {a.time}
              </p>
              <div className="flex gap-3">
                <button className="text-xs text-neutral-400 hover:text-white">Remove</button>
                <button className="text-xs bg-yellow-400 text-neutral-900 font-medium rounded-md px-3 py-1">
                  Follow Back
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
