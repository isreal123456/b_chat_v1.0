import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../providers/ThemeProvider";

export default function ThemeToggle({ labeled = false }) {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "light" ? "dark" : "light";
  const Icon = theme === "light" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={labeled ? "btn btn-outline btn-sm" : "btn-icon theme-toggle"}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      <Icon size={16} aria-hidden="true" />
      {labeled && <span>{next === "dark" ? "Dark" : "Light"} mode</span>}
    </button>
  );
}
