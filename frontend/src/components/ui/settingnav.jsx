function SettingsNav({ active, onSelect, tabs}) {
  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-3 space-y-1 h-fit">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            active === id
              ? "bg-yellow-400 text-neutral-900"
              : "text-neutral-400 hover:bg-neutral-700/60 hover:text-white"
          }`}
        >
          <Icon size={17} />
          {label}
        </button>
      ))}
    </div>
  );
}
export default SettingsNav;