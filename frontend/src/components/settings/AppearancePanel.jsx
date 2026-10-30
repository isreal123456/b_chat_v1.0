import { Check } from "lucide-react";
import SectionCard from "./SectionCard";
import { useTheme } from "../../providers/ThemeProvider";

const palettes = [
  { name: "Ink", color: "#090c0a", note: "canvas" },
  { name: "Surface", color: "#171e19", note: "panels" },
  { name: "Lime", color: "#c8fa4b", note: "accent" },
  { name: "Mint", color: "#62e3c0", note: "signal" },
];

export default function AppearancePanel() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="settings-stack">
      <SectionCard title="Theme" description="TickMe ships with a dark and a light terminal. Pick the one that fits your setup.">
        <div className="theme-choice-grid">
          {[
            { id: "dark", label: "Dark", note: "Terminal Lime on ink" },
            { id: "light", label: "Light", note: "Lime on paper" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              className={`theme-choice${theme === option.id ? " is-active" : ""}`}
              aria-pressed={theme === option.id}
            >
              <span className={`theme-choice__preview theme-choice__preview--${option.id}`} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="theme-choice__label">
                <span>{option.label}</span>
                <small>{option.note}</small>
              </span>
              {theme === option.id && (
                <span className="theme-choice__check" aria-hidden="true">
                  <Check size={14} />
                </span>
              )}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Palette" description="Terminal Lime pairs a near-black canvas with an electric lime signal color.">
        <div className="theme-swatches" aria-label="Terminal Lime palette">
          {palettes.map(({ name, color, note }) => (
            <span key={name} className="theme-swatch">
              <i style={{ backgroundColor: color }} aria-hidden="true" />
              {name}
              <small>{note}</small>
            </span>
          ))}
        </div>
        <p className="hint">Typography: Space Grotesk for display, Inter for body, JetBrains Mono for labels.</p>
      </SectionCard>
    </div>
  );
}
