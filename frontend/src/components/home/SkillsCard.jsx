export default function SkillsCard({ skills }) {
  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6">
      <h3 className="text-white font-semibold mb-4">Skills</h3>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, i) => (
          <span
            key={`${skill}-${i}`}
            className="text-xs text-neutral-300 bg-neutral-700 rounded-lg px-3 py-1.5"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}
