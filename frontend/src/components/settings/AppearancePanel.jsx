"use client";

import { useState } from "react";
import SectionCard from "./SectionCard";

export default function AppearancePanel() {
  const [theme, setTheme] = useState("dark");

  const options = [
    { id: "dark", label: "Dark" },
    { id: "light", label: "Light" },
    { id: "system", label: "System" },
  ];

  return (
    <SectionCard title="Appearance" description="Choose how the app looks on your device.">
      <div className="grid grid-cols-3 gap-3">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => setTheme(o.id)}
            className={`text-sm font-medium rounded-xl py-3 border transition-colors ${
              theme === o.id
                ? "bg-yellow-400 text-neutral-900 border-yellow-400"
                : "bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-600"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </SectionCard>
  );
}
