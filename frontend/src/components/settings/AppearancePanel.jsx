"use client";

import SectionCard from "./SectionCard";

export default function AppearancePanel() {
  return (
    <SectionCard title="Appearance" description="The current Bchat theme uses a dark canvas with bright signal colors.">
      <div className="flex flex-wrap gap-3" aria-label="Current color palette">
        {[['Electric Lime', '#B8FF3D'], ['Digital Purple', '#6C63FF'], ['Deep Black', '#0D0D12'], ['Surface', '#17171F'], ['White', '#F8FAFC']].map(([label, color]) => (
          <span key={label} className="flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-300">
            <span aria-hidden="true" className="h-4 w-4 rounded-full border border-white/10" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </SectionCard>
  );
}
