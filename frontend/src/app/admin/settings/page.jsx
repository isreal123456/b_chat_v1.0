import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
} from "lucide-react";

import AdminShell from "../../../components/admin/AdminShell";
import { PageHeader, SectionPanel } from "../../../components/admin/PageHeader";
import StatusBadge from "../../../components/admin/StatusBadge";
import ConfirmDialog from "../../../components/admin/ConfirmDialog";
import { useAdminToast } from "../../../components/admin/ToastProvider";
import Avatar from "../../../components/ui/Avatar";
import {
  fetchAdminSettings,
  fetchAdminTeam,
  hasAdminPermission,
  updateAdminSettings,
} from "../../../lib/admin";
import { ROLE_LABELS, formatDateTime, timeAgo } from "../../../lib/adminFormat";
import { getMediaUrl } from "../../../lib/api";
import { useAuth } from "../../../providers/AuthProvider";

function SettingField({ setting, value, onChange, disabled }) {
  const id = `setting-${setting.key}`;
  if (typeof setting.default === "boolean") {
    return (
      <label className="admin-setting-toggle" htmlFor={id}>
        <span>
          <strong>{setting.label}</strong>
          <small>{setting.description}</small>
        </span>
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
    );
  }

  if (typeof setting.default === "number") {
    return (
      <label className="admin-field" htmlFor={id}>
        <span>{setting.label}</span>
        <input
          id={id}
          className="input"
          type="number"
          min={0}
          max={100}
          value={value ?? 0}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <small className="admin-field__hint">{setting.description}</small>
      </label>
    );
  }

  const isMessage = setting.key === "maintenance_message";
  return (
    <label className={`admin-field${isMessage ? " admin-field--wide" : ""}`} htmlFor={id}>
      <span>{setting.label}</span>
      {isMessage ? (
        <textarea
          id={id}
          className="textarea"
          rows={3}
          maxLength={200}
          value={value ?? ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          className="input"
          value={value ?? ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <small className="admin-field__hint">{setting.description}</small>
    </label>
  );
}

export default function AdminSettingsPage() {
  const { user: me } = useAuth();
  const { push } = useAdminToast();
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({});
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [maintenanceConfirm, setMaintenanceConfirm] = useState(false);

  const canManage = hasAdminPermission(me, "settings.manage");

  const load = useCallback(async () => {
    await Promise.resolve();
    setError("");
    try {
      const [settings, teamData] = await Promise.all([fetchAdminSettings(), fetchAdminTeam()]);
      setData(settings);
      setDraft(settings.settings);
      setTeam(teamData.items || []);
    } catch (requestError) {
      setError(requestError.message || "Could not load platform settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const changes = useMemo(() => {
    if (!data) return {};
    const result = {};
    Object.entries(draft).forEach(([key, value]) => {
      if (value !== data.settings[key]) result[key] = value;
    });
    return result;
  }, [draft, data]);

  const dirty = Object.keys(changes).length > 0;

  const persist = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      const updated = await updateAdminSettings(changes);
      setData((current) => ({ ...current, settings: updated.settings }));
      setDraft(updated.settings);
      setMaintenanceConfirm(false);
      push("Platform settings saved");
    } catch (requestError) {
      push(requestError.message || "Could not save settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    if (!dirty) return;
    if (changes.maintenance_mode === true) {
      setMaintenanceConfirm(true);
      return;
    }
    persist();
  };

  const reset = () => {
    if (data) setDraft(data.settings);
  };

  return (
    <AdminShell>
      <PageHeader
        eyebrow="System"
        title="Platform settings"
        description="Control registration, moderation, notifications, and maintenance behaviour."
        actions={
          <div className="admin-toolbar">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setLoading(true); load().then(() => push("Settings refreshed", "info")); }} disabled={loading}>
              <RefreshCw size={15} aria-hidden="true" className={loading ? "is-spinning" : ""} />
              Refresh
            </button>
            {canManage && (
              <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={!dirty || saving}>
                <Save size={15} aria-hidden="true" />
                {saving ? "Saving…" : "Save changes"}
              </button>
            )}
          </div>
        }
      />

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      {!canManage && !loading && (
        <div className="alert alert--info" role="status">
          You can review platform settings, but only Super Admins can change them.
        </div>
      )}

      {dirty && canManage && (
        <div className="admin-unsaved" role="status">
          <span>
            <SlidersHorizontal size={15} aria-hidden="true" />
            {Object.keys(changes).length} unsaved {Object.keys(changes).length === 1 ? "change" : "changes"}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset} disabled={saving}>
            Discard
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="admin-inline-state" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>Loading settings…</span>
        </div>
      ) : (
        <div className="admin-settings-grid">
          {(data?.groups || []).map((group) => (
            <SectionPanel
              key={group.id}
              title={group.label}
              description={group.description}
              className={group.id === "maintenance" ? "admin-panel--warning" : ""}
            >
              {group.id === "maintenance" && (
                <div className="admin-callout admin-callout--warning">
                  <AlertTriangle size={16} aria-hidden="true" />
                  <span>Maintenance mode returns 503 to public routes. This console and the API docs stay available.</span>
                </div>
              )}
              <div className="admin-settings-fields">
                {group.settings.map((setting) => (
                  <SettingField
                    key={setting.key}
                    setting={setting}
                    value={draft[setting.key]}
                    disabled={!canManage || saving}
                    onChange={(value) => setDraft((current) => ({ ...current, [setting.key]: value }))}
                  />
                ))}
              </div>
            </SectionPanel>
          ))}
        </div>
      )}

      <SectionPanel
        title="Administrator accounts"
        description="Console access is granted by role. Only Super Admins can promote or demote administrators."
        action={
          <Link className="admin-text-link" to="/admin/users?role=moderator">
            Browse team <ArrowRight size={13} aria-hidden="true" />
          </Link>
        }
      >
        <ul className="admin-team-list">
          {team.map((person) => (
            <li key={person.id}>
              <Avatar name={person.name || person.username} src={getMediaUrl(person.avatar_url)} size={38} />
              <div className="admin-team-list__copy">
                <strong>{person.name || person.username}</strong>
                <small>
                  @{person.username} · {person.email} · last active {timeAgo(person.last_active_at)}
                </small>
              </div>
              <span className={`admin-badge admin-badge--${person.role === "super_admin" ? "accent" : person.role === "admin" ? "info" : "teal"}`}>
                {ROLE_LABELS[person.role] || person.role}
              </span>
              <StatusBadge status={person.account_status} />
              <Link className="btn btn-outline btn-sm" to={`/admin/users/${person.id}`}>
                <UserCog size={14} aria-hidden="true" />
                Manage
              </Link>
            </li>
          ))}
          {!team.length && !loading && <li className="admin-empty-note">No administrator accounts found.</li>}
        </ul>
      </SectionPanel>

      <p className="admin-footnote">
        <ShieldCheck size={13} aria-hidden="true" /> Settings changes are recorded in the activity log
        {data?.updated_at ? ` · last updated ${formatDateTime(data.updated_at)}` : ""}.
      </p>

      <ConfirmDialog
        open={maintenanceConfirm}
        title="Enable maintenance mode?"
        description="Public TickMe routes will return 503 until you switch it off. Administrators keep console access."
        confirmLabel="Enable maintenance mode"
        tone="danger"
        busy={saving}
        onConfirm={persist}
        onClose={() => !saving && setMaintenanceConfirm(false)}
      >
        <p className="admin-dialog-preview">{draft.maintenance_message || "No maintenance message set."}</p>
      </ConfirmDialog>
    </AdminShell>
  );
}
