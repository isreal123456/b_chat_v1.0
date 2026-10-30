import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Briefcase, Code2, Globe, MapPin, PenTool } from "lucide-react";

import Logo from "../../components/brand/Logo";
import Avatar from "../../components/ui/Avatar";
import Field from "../../components/settings/Field";
import Toggle from "../../components/settings/Toggle";
import SkillsInput from "../../components/profile/SkillsInput";
import { useAuth } from "../../providers/AuthProvider";
import { api, getMediaUrl } from "../../lib/api";
import { CATEGORIES, categoryLabel } from "../../lib/profile";

const STEPS = [
  { title: "What do you do?", copy: "Pick the focus that best describes your work. You can change it later." },
  { title: "Show your craft", copy: "A short headline and a few skills help people understand where you shine." },
  { title: "Where to find you", copy: "Add the links you want collaborators to see, and tell them if you are open to work." },
];

export default function OnboardingPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    category: user?.category || "",
    headline: user?.headline || "",
    skills: user?.skills || [],
    github_url: user?.github_url || "",
    portfolio_url: user?.portfolio_url || "",
    linkedin_url: user?.linkedin_url || "",
    location: user?.location || "",
    available_for_work: Boolean(user?.available_for_work),
  });

  if (!user) return null;
  if (user.onboarded) return <Navigate to="/home" replace />;

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const handleChange = (event) => update(event.target.name, event.target.value);

  const handleFinish = async () => {
    setError("");
    setSaving(true);
    try {
      const saved = await api("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ ...form, onboarded: true }),
      });
      updateUser(saved);
      navigate("/home", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Could not save your profile. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const current = STEPS[step];

  return (
    <main className="onboarding">
      <header className="onboarding__top">
        <Logo to="/home" />
        <span className="onboarding__step">Step {step + 1} of {STEPS.length}</span>
      </header>

      <div className="onboarding__grid">
        <section className="card onboarding__card">
          <div className="onboarding__progress" aria-hidden="true">
            {STEPS.map((item, index) => (
              <span key={item.title} className={index <= step ? "is-done" : ""} />
            ))}
          </div>

          <header className="onboarding__head">
            <p className="eyebrow">Profile setup</p>
            <h1>{current.title}</h1>
            <p className="muted">{current.copy}</p>
          </header>

          <div className="onboarding__body">
            {step === 0 && (
              <div className="category-grid" role="radiogroup" aria-label="Your focus">
                {CATEGORIES.map((category) => {
                  const Icon = category.value === "developer" ? Code2 : PenTool;
                  const active = form.category === category.value;
                  return (
                    <button
                      key={category.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`category-card${active ? " is-active" : ""}`}
                      onClick={() => update("category", category.value)}
                    >
                      <span className="category-card__icon" aria-hidden="true">
                        <Icon size={20} />
                      </span>
                      <strong>{category.label}</strong>
                      <span>{category.description}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {step === 1 && (
              <div className="form-stack">
                <Field label="Headline" hint="A short line about what you build, like “Frontend engineer · design systems”.">
                  <input
                    type="text"
                    name="headline"
                    value={form.headline}
                    onChange={handleChange}
                    className="input"
                    maxLength={120}
                    placeholder="Frontend engineer · design systems"
                  />
                </Field>
                <Field label="Skills" hint="Tools, languages, or disciplines you want to be known for.">
                  <SkillsInput id="onboarding-skills" value={form.skills} onChange={(skills) => update("skills", skills)} />
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="form-stack">
                <Field label="GitHub">
                  <div className="input-affix">
                    <Code2 size={16} aria-hidden="true" />
                    <input
                      type="url"
                      name="github_url"
                      value={form.github_url}
                      onChange={handleChange}
                      className="input"
                      placeholder="https://github.com/your-handle"
                    />
                  </div>
                </Field>
                <Field label="Portfolio">
                  <div className="input-affix">
                    <Globe size={16} aria-hidden="true" />
                    <input
                      type="url"
                      name="portfolio_url"
                      value={form.portfolio_url}
                      onChange={handleChange}
                      className="input"
                      placeholder="https://your-site.dev"
                    />
                  </div>
                </Field>
                <Field label="LinkedIn">
                  <div className="input-affix">
                    <Briefcase size={16} aria-hidden="true" />
                    <input
                      type="url"
                      name="linkedin_url"
                      value={form.linkedin_url}
                      onChange={handleChange}
                      className="input"
                      placeholder="https://linkedin.com/in/you"
                    />
                  </div>
                </Field>
                <Field label="Location">
                  <div className="input-affix">
                    <MapPin size={16} aria-hidden="true" />
                    <input
                      type="text"
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      className="input"
                      maxLength={100}
                      placeholder="Berlin, remote"
                    />
                  </div>
                </Field>
                <Toggle
                  label="Open to work"
                  hint="Show a badge on your profile so collaborators know you are available."
                  checked={form.available_for_work}
                  onChange={(value) => update("available_for_work", value)}
                />
              </div>
            )}
          </div>

          {error && <p className="alert alert--error" role="alert" style={{ marginTop: "1rem" }}>{error}</p>}

          <div className="onboarding__actions">
            {step > 0 ? (
              <button type="button" className="btn btn-ghost" onClick={() => setStep((value) => value - 1)}>
                Back
              </button>
            ) : (
              <span />
            )}

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep((value) => value + 1)}
                disabled={step === 0 && !form.category}
              >
                Continue
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={handleFinish} disabled={saving || !form.category}>
                {saving ? "Saving…" : "Finish setup"}
              </button>
            )}
          </div>
        </section>

        <aside className="onboarding__aside" aria-label="Profile preview">
          <p className="eyebrow">Live preview</p>
          <div className="card onboarding__preview">
            <Avatar
              name={user.name || user.username}
              src={user.avatar_url ? getMediaUrl(user.avatar_url) : ""}
              size={64}
            />
            <strong>{user.name || user.username}</strong>
            <span className="onboarding__preview-handle">@{user.username}</span>
            {form.category && <span className="badge badge--accent">{categoryLabel(form.category)}</span>}
            {form.headline && <p className="onboarding__preview-headline">{form.headline}</p>}
            {form.skills.length > 0 && (
              <div className="chip-row">
                {form.skills.slice(0, 6).map((skill) => (
                  <span key={skill} className="chip">{skill}</span>
                ))}
              </div>
            )}
            {form.available_for_work && <span className="chip chip--teal">Open to work</span>}
          </div>
          <p className="hint">You can edit all of this later in Settings.</p>
        </aside>
      </div>
    </main>
  );
}
