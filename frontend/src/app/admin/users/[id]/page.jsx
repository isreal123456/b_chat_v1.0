import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  CheckCircle2,
  ExternalLink,
  FileText,
  MessageSquare,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";

import AdminShell from "../../../../components/admin/AdminShell";
import { PageHeader, SectionPanel, StatCard } from "../../../../components/admin/PageHeader";
import StatusBadge from "../../../../components/admin/StatusBadge";
import ConfirmDialog from "../../../../components/admin/ConfirmDialog";
import { useAdminToast } from "../../../../components/admin/ToastProvider";
import Avatar from "../../../../components/ui/Avatar";
import {
  deleteAdminUser,
  fetchAdminUser,
  hasAdminPermission,
  restoreAdminUser,
  suspendAdminUser,
  updateAdminUser,
  updateAdminUserRole,
} from "../../../../lib/admin";
import {
  ROLE_LABELS,
  actionLabel,
  formatDate,
  formatDateTime,
  formatNumber,
  timeAgo,
  truncate,
} from "../../../../lib/adminFormat";
import { getMediaUrl } from "../../../../lib/api";
import { useAuth } from "../../../../providers/AuthProvider";

const EDIT_FIELDS = [
  ["name", "Display name"],
  ["username", "Username"],
  ["email", "Email"],
  ["headline", "Headline"],
  ["location", "Location"],
  ["github_url", "GitHub URL"],
  ["portfolio_url", "Portfolio URL"],
  ["linkedin_url", "LinkedIn URL"],
];

function emptyForm(user) {
  return {
    name: user.name || "",
    username: user.username || "",
    email: user.email || "",
    headline: user.headline || "",
    bio: user.bio || "",
    location: user.location || "",
    category: user.category || "",
    skills: (user.skills || []).join(", "),
    github_url: user.github_url || "",
    portfolio_url: user.portfolio_url || "",
    linkedin_url: user.linkedin_url || "",
    available_for_work: Boolean(user.available_for_work),
    email_verified: Boolean(user.email_verified),
  };
}

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const { push } = useAdminToast();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [roleDraft, setRoleDraft] = useState("user");
  const [busy, setBusy] = useState(false);

  const canManage = hasAdminPermission(me, "users.manage");
  const canDelete = hasAdminPermission(me, "users.delete");
  const canChangeRoles = hasAdminPermission(me, "admins.manage");
  const isSelf = String(me?.id) === String(id);

  const load = useCallback(async () => {
    await Promise.resolve();
    setError("");
    try {
      const data = await fetchAdminUser(id);
      setMember(data);
      setForm(emptyForm(data));
      setRoleDraft(data.role || "user");
    } catch (requestError) {
      setError(requestError.message || "Could not load this member.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const refresh = () => {
    setLoading(true);
    load().then(() => push("Member refreshed", "info"));
  };

  const stats = useMemo(
    () => [
      { label: "Posts", value: member?.post_count, icon: FileText },
      { label: "Comments", value: member?.comment_count, icon: MessageSquare },
      { label: "Ticks received", value: member?.ticks_received, icon: CheckCircle2 },
      { label: "Followers", value: member?.follower_count, icon: Users },
      { label: "Following", value: member?.following_count, icon: Users },
      { label: "Projects", value: member?.project_count, icon: ShieldCheck },
    ],
    [member],
  );

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        skills: form.skills
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };
      const updated = await updateAdminUser(id, payload);
      setMember((current) => ({ ...current, ...updated }));
      setForm(emptyForm(updated));
      setEditing(false);
      push(`@${updated.username} updated`);
    } catch (requestError) {
      push(requestError.message || "Could not save changes.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async () => {
    if (suspendReason.trim().length < 3) {
      push("Add a short reason (at least 3 characters).", "error");
      return;
    }
    setBusy(true);
    try {
      const updated = await suspendAdminUser(id, suspendReason.trim());
      setMember((current) => ({ ...current, ...updated }));
      setSuspendOpen(false);
      setSuspendReason("");
      push(`@${updated.username} suspended`, "info");
    } catch (requestError) {
      push(requestError.message || "Could not suspend this account.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    try {
      const updated = await restoreAdminUser(id);
      setMember((current) => ({ ...current, ...updated }));
      setRestoreOpen(false);
      push(`@${updated.username} restored`);
    } catch (requestError) {
      push(requestError.message || "Could not restore this account.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleRole = async () => {
    if (roleDraft === member.role) return;
    setBusy(true);
    try {
      const updated = await updateAdminUserRole(id, roleDraft);
      setMember((current) => ({ ...current, ...updated }));
      push(`Role updated to ${ROLE_LABELS[updated.role] || updated.role}`);
    } catch (requestError) {
      push(requestError.message || "Could not change this role.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm.trim().toLowerCase() !== (member?.username || "").toLowerCase()) {
      push("Type the username exactly to confirm.", "error");
      return;
    }
    setBusy(true);
    try {
      await deleteAdminUser(id, { confirm: deleteConfirm.trim(), reason: deleteReason.trim() });
      push(`@${member.username} permanently deleted`, "info");
      navigate("/admin/users", { replace: true });
    } catch (requestError) {
      push(requestError.message || "Could not delete this account.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !member) {
    return (
      <AdminShell>
        <div className="admin-inline-state" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>Loading member record…</span>
        </div>
      </AdminShell>
    );
  }

  if (!member) {
    return (
      <AdminShell>
        <PageHeader title="Member not found" eyebrow="Community" />
        {error && <div className="alert alert--error" role="alert">{error}</div>}
        <Link className="btn btn-secondary" to="/admin/users">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to members
        </Link>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <Link className="admin-back" to="/admin/users">
        <ArrowLeft size={15} aria-hidden="true" />
        All members
      </Link>

      <PageHeader
        eyebrow="Member record"
        title={member.name || member.username}
        description={`@${member.username} · joined ${formatDate(member.created_at)}`}
        actions={
          <div className="admin-toolbar">
            <button type="button" className="btn btn-secondary btn-sm" onClick={refresh} disabled={loading}>
              <RefreshCw size={15} aria-hidden="true" className={loading ? "is-spinning" : ""} />
              Refresh
            </button>
            {canManage && !isSelf && (
              <button
                type="button"
                className={`btn btn-sm ${member.account_status === "active" ? "btn-danger" : "btn-primary"}`}
                onClick={() => (member.account_status === "active" ? setSuspendOpen(true) : setRestoreOpen(true))}
              >
                {member.account_status === "active" ? <Ban size={15} aria-hidden="true" /> : <UserCheck size={15} aria-hidden="true" />}
                {member.account_status === "active" ? "Suspend" : "Restore"}
              </button>
            )}
          </div>
        }
      />

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      <section className="admin-identity card">
        <Avatar name={member.name || member.username} src={getMediaUrl(member.avatar_url)} size={72} rounded />
        <div className="admin-identity__copy">
          <div className="admin-identity__name">
            <h2>{member.name || member.username}</h2>
            {member.email_verified && <BadgeCheck size={17} aria-label="Email verified" />}
            <StatusBadge status={member.account_status} />
            <span className={`admin-badge admin-badge--${member.role === "super_admin" ? "accent" : member.role === "user" ? "neutral" : "info"}`}>
              {ROLE_LABELS[member.role] || member.role}
            </span>
          </div>
          <p className="admin-identity__handle">
            @{member.username} · {member.email}
          </p>
          {member.headline && <p className="admin-identity__headline">{member.headline}</p>}
          <p className="admin-identity__meta">
            {member.category ? `${member.category} · ` : ""}
            {member.location ? `${member.location} · ` : ""}
            Last active {timeAgo(member.last_active_at)}
          </p>
          {member.account_status !== "active" && member.suspension_reason && (
            <p className="admin-identity__alert">
              Suspended {timeAgo(member.suspended_at)} · {member.suspension_reason}
            </p>
          )}
          {member.bio && <p className="admin-identity__bio">{member.bio}</p>}
          <div className="admin-identity__links">
            <Link className="btn btn-outline btn-sm" to={`/profile/${member.username}`}>
              <ExternalLink size={14} aria-hidden="true" />
              Public profile
            </Link>
            {canManage && !isSelf && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing((open) => !open)}>
                <Pencil size={14} aria-hidden="true" />
                {editing ? "Close editor" : "Edit profile"}
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="admin-stat-grid admin-stat-grid--wide">
        {stats.map(({ label, value, icon: Icon }) => (
          <StatCard key={label} label={label} value={formatNumber(value)} icon={Icon} />
        ))}
      </div>

      {editing && form && (
        <SectionPanel title="Edit member" description="Administrator changes are recorded in the activity log.">
          <form className="admin-form" onSubmit={handleSave}>
            <div className="admin-form-grid">
              {EDIT_FIELDS.map(([key, label]) => (
                <label key={key} className="admin-field">
                  <span>{label}</span>
                  <input
                    className="input"
                    type={key === "email" ? "email" : "text"}
                    value={form[key]}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  />
                </label>
              ))}
              <label className="admin-field">
                <span>Discipline</span>
                <select
                  className="input admin-select"
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                >
                  <option value="">Not set</option>
                  <option value="developer">Developer</option>
                  <option value="designer">Designer</option>
                </select>
              </label>
              <label className="admin-field admin-field--wide">
                <span>Skills (comma separated)</span>
                <input
                  className="input"
                  value={form.skills}
                  onChange={(event) => setForm((current) => ({ ...current, skills: event.target.value }))}
                />
              </label>
              <label className="admin-field admin-field--wide">
                <span>Bio</span>
                <textarea
                  className="textarea"
                  rows={3}
                  maxLength={160}
                  value={form.bio}
                  onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                />
              </label>
            </div>
            <div className="admin-switch-row">
              <label className="admin-switch">
                <input
                  type="checkbox"
                  checked={form.available_for_work}
                  onChange={(event) => setForm((current) => ({ ...current, available_for_work: event.target.checked }))}
                />
                <span>Available for work</span>
              </label>
              <label className="admin-switch">
                <input
                  type="checkbox"
                  checked={form.email_verified}
                  onChange={(event) => setForm((current) => ({ ...current, email_verified: event.target.checked }))}
                />
                <span>Email verified</span>
              </label>
            </div>
            <div className="admin-form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </SectionPanel>
      )}

      {canChangeRoles && !isSelf && (
        <SectionPanel title="Access level" description="Roles grant console permissions. Only Super Admins can change them.">
          <div className="admin-role-control">
            <label className="admin-field">
              <span>Role</span>
              <select className="input admin-select" value={roleDraft} onChange={(event) => setRoleDraft(event.target.value)}>
                <option value="user">Member</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </label>
            <button type="button" className="btn btn-primary" onClick={handleRole} disabled={busy || roleDraft === member.role}>
              <ShieldCheck size={15} aria-hidden="true" />
              Update role
            </button>
          </div>
          <p className="admin-footnote">At least one Super Admin must always remain. Your own role cannot be changed here.</p>
        </SectionPanel>
      )}

      <div className="admin-two-col">
        <SectionPanel
          title="Recent posts"
          action={<Link className="admin-text-link" to={`/admin/content/posts?author_id=${member.id}`}>View all</Link>}
        >
          <ul className="admin-post-list">
            {(member.recent_posts || []).map((post) => (
              <li key={post.id}>
                <Link to={`/admin/content/posts/${post.id}`}>
                  <p>{truncate(post.content || "(media only)", 110)}</p>
                  <small>
                    {formatDateTime(post.created_at)} · {formatNumber(post.tick_count)} ticks · {formatNumber(post.comment_count)} comments
                  </small>
                </Link>
                <StatusBadge status={post.moderation_status} />
              </li>
            ))}
            {!(member.recent_posts || []).length && <li className="admin-empty-note">No posts yet.</li>}
          </ul>
        </SectionPanel>

        <SectionPanel title="Reports involving this member">
          <ul className="admin-record-list">
            {(member.reports || []).map((report) => (
              <li key={report.id}>
                <Link to={`/admin/reports/${report.id}`}>
                  <span>
                    <strong>
                      {report.target_type} · {report.reason.replace("_", " ")}
                    </strong>
                    <small>
                      {report.reporter ? `Reported by @${report.reporter.username}` : "Reporter deleted"} · {timeAgo(report.created_at)}
                    </small>
                  </span>
                  <StatusBadge status={report.status} />
                </Link>
              </li>
            ))}
            {!(member.reports || []).length && <li className="admin-empty-note">No reports on record.</li>}
          </ul>
        </SectionPanel>
      </div>

      <SectionPanel title="Administrator activity on this account">
        <ul className="admin-timeline">
          {(member.activity || []).map((entry) => (
            <li key={entry.id}>
              <span className="admin-timeline__dot" aria-hidden="true" />
              <span>
                <strong>{actionLabel(entry.action)}</strong>
                <small>
                  {entry.summary || entry.target_type} · {entry.admin?.username ? `@${entry.admin.username}` : "system"} ·{" "}
                  {formatDateTime(entry.created_at)}
                </small>
              </span>
            </li>
          ))}
          {!(member.activity || []).length && <li className="admin-empty-note">No administrator actions recorded.</li>}
        </ul>
      </SectionPanel>

      {canDelete && !isSelf && (
        <SectionPanel title="Danger zone" description="Permanent deletion cannot be undone." className="admin-panel--danger">
          <div className="admin-danger-row">
            <div>
              <strong>Delete this account</strong>
              <p>
                Removes @{member.username}, their posts, comments, projects, messages, reports, and social graph.
                This action is irreversible and is recorded in the audit log.
              </p>
            </div>
            <button type="button" className="btn btn-danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={15} aria-hidden="true" />
              Delete account
            </button>
          </div>
        </SectionPanel>
      )}

      <ConfirmDialog
        open={suspendOpen}
        title={`Suspend @${member.username}?`}
        description="Suspended members cannot sign in or interact with TickMe. You can restore the account later."
        confirmLabel="Suspend account"
        tone="danger"
        busy={busy}
        onConfirm={handleSuspend}
        onClose={() => !busy && setSuspendOpen(false)}
      >
        <label className="admin-field">
          <span>Reason (shown in the audit log)</span>
          <textarea
            className="textarea"
            rows={3}
            maxLength={255}
            value={suspendReason}
            onChange={(event) => setSuspendReason(event.target.value)}
            placeholder="e.g. Harassment in direct messages"
          />
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={restoreOpen}
        title={`Restore @${member.username}?`}
        description="The account will regain full access to TickMe immediately."
        confirmLabel="Restore account"
        busy={busy}
        onConfirm={handleRestore}
        onClose={() => !busy && setRestoreOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={`Permanently delete @${member.username}?`}
        description="This removes the account and all owned content. It cannot be undone."
        confirmLabel="Delete permanently"
        tone="danger"
        busy={busy}
        confirmDisabled={deleteConfirm.trim().toLowerCase() !== member.username.toLowerCase()}
        onConfirm={handleDelete}
        onClose={() => !busy && setDeleteOpen(false)}
      >
        <div className="admin-delete-form">
          <label className="admin-field">
            <span>
              Type <code>{member.username}</code> to confirm
            </span>
            <input
              className="input"
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="admin-field">
            <span>Reason (optional)</span>
            <input
              className="input"
              value={deleteReason}
              onChange={(event) => setDeleteReason(event.target.value)}
              maxLength={255}
              placeholder="Why is this account being deleted?"
            />
          </label>
        </div>
      </ConfirmDialog>
    </AdminShell>
  );
}
