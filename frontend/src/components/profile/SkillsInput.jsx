import { useState } from "react";
import { X } from "lucide-react";

export default function SkillsInput({ id = "skills", value, onChange, max = 20, label = "skills", placeholder = "React, TypeScript, Figma…" }) {
  const [draft, setDraft] = useState("");

  const addSkill = (raw = draft) => {
    const label = raw.replace(/,/g, " ").replace(/\s+/g, " ").trim().slice(0, 30);
    if (!label || value.length >= max) {
      setDraft("");
      return;
    }
    if (!value.some((skill) => skill.toLowerCase() === label.toLowerCase())) {
      onChange([...value, label]);
    }
    setDraft("");
  };

  const removeSkill = (skill) => onChange(value.filter((item) => item !== skill));

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addSkill();
    } else if (event.key === "Backspace" && !draft && value.length) {
      removeSkill(value[value.length - 1]);
    }
  };

  return (
    <div className="skills-editor">
      <div className="skills-editor__entry">
        <input
          id={id}
          type="text"
          className="input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => addSkill()}
          disabled={!draft.trim() || value.length >= max}
        >
          Add
        </button>
      </div>

      {value.length > 0 && (
        <ul className="skills-editor__list" aria-label={`Selected ${label}`}>
          {value.map((skill) => (
            <li key={skill} className="skill-chip">
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                aria-label={`Remove ${skill}`}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="hint">
        {value.length}/{max} {label} · press Enter or comma to add
      </p>
    </div>
  );
}
