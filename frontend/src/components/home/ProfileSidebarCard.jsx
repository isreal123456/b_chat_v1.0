export default function ProfileSidebarCard() {
  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 text-center">
      <div className="relative w-24 h-24 mx-auto mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-yellow-400/30" />
        <img
          src="https://i.pravatar.cc/200?img=68"
          alt="Elviz Dizzouza"
          className="w-24 h-24 rounded-2xl object-cover mx-auto"
        />
      </div>

      <div className="flex justify-center gap-8 mb-4 text-sm">
        <div>
          <p className="text-white font-semibold">1984</p>
          <p className="text-neutral-500">Followers</p>
        </div>
        <div>
          <p className="text-white font-semibold">1002</p>
          <p className="text-neutral-500">Following</p>
        </div>
      </div>

      <h2 className="text-white font-semibold">Elviz Dizzouza</h2>
      <p className="text-neutral-500 text-sm mb-3">@elvizoodem</p>

      <p className="text-neutral-300 text-sm mb-4">
        Hello, I'm a UI/UX designer. Open to new projects.
      </p>

      <button className="w-full bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-medium rounded-lg py-2 transition-colors">
        My Profile
      </button>
    </div>
  );
}
