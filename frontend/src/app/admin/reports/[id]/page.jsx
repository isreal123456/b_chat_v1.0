import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Flag,
  RefreshCw,
  Undo2,
  XCircle,
} from "lucide-react";

import AdminShell from "../../../../components/admin/AdminShell";
import { PageHeader, SectionPanel } from "../../../../components/admin/PageHeader";
import StatusBadge from "../../../../components/admin/StatusBadge";
import ConfirmDialog from "../../../../components/admin/ConfirmDialog";
import { useAdminToast } from "../../../../components/admin/ToastProvider";
import {
  fetchAdminReport,
  hasAdminPermission,
  updateAdminReport,
} from "../../../../lib/admin";
import {
  REPORT_REASON_LABELS,
  formatDateTime,
  timeAgo,
  truncate,
} from "../../../../lib/adminFormat";
import { useAuth } from "../../../../providers/AuthProvider";

const ACTION_LABELS = {
  none: "No content change",
  content_removed: "Remove the reported content",
  content_restored: "Restore the reported content",
  user_suspended: "Suspend the reported account",
};

function targetPath(targetType, targetId) {
  if (targetType === "post") return `/admin/content/posts/${targetId}`;
  if (targetType === "comment") return `/admin/content/comments`;
  if (targetType === "project") return `/admin/projects/${targetId}`;
  return null;
}

export default function AdminReportDetailPage() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const { push } = useAdminToast();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [action, setAction] = useState("none");
  const [decision, setDecision] = useState(null);
  const [busy, setBusy] = useState(false);

  const canManage = hasAdminPermission(me, "reports.manage");

  const load = useCallback(async () => {
    await Promise.resolve();
    setError("");
    try {
      setReport(await fetchAdminReport(id));
    } catch (requestError) {
      setError(requestError.message || "Could not load this report.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const refresh = () => {
    setLoading(true);
    load().then(() => push("Report refreshed", "info"));
  };

  const actionOptions = useMemo(() => {
    if (!report) return ["none"];
    const options = ["none"];
    if (["post", "comment", "project"].includes(report.target_type) && report.target?.available) {
      options.push(report.target.status === "removed" ? "content_restored" : "content_removed");
    }
    if (report.target_author_account && report.target_author_account.account_status === "active") {
      options.push("user_suspended");
    }
    return options;
  }, [report]);

  const applyUpdate = async (payload) => {
    setBusy(true);
    try {
      const updated = await updateAdminReport(id, payload);
      setReport((current) => ({ ...current, ...updated }));
      push(payload.status === "under_review" ? "Report marked under review" : `Report ${payload.status}`);
      setDecision(null);
      setNote("");
      setAction("none");
    } catch (requestError) {
      push(requestError.message || "Could not update this report.", "error");
    } finally {
      setBusy(false);
    }
  };

  const markUnderReview = () => {
    if (!canManage) return;
    applyUpdate({ status: "under_review", resolution_note: note.trim(), resolution_action: "none" });
  };

  const requestClose = (status) => {
    if (note.trim().length < 3) {
      push("Add a short resolution note (at least 3 characters).", "error");
      return;
    }
    setDecision({
      status,
      resolution_note: note.trim(),
      resolution_action: action,
    });
  };

  if (loading && !report) {
    return (
      <AdminShell>
        <div className="admin-inline-state" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>Loading report…</span>
        </div>
      </AdminShell>
    );
  }

  if (!report) {
    return (
      <AdminShell>
        <PageHeader eyebrow="Trust & safety" title="Report not found" />
        {error && <div className="alert alert--error" role="alert">{error}</div>}
        <Link className="btn btn-secondary" to="/admin/reports">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to reports
        </Link>
      </AdminShell>
    );
  }

  const closed = ["resolved", "dismissed"].includes(report.status);
  const targetLink = targetPath(report.target_type, report.target_id);

  return (
    <AdminShell>
      <Link className="admin-back" to="/admin/reports">
        <ArrowLeft size={15} aria-hidden="true" />
        All reports
      </Link>

      <PageHeader
        eyebrow={`Report #${report.id}`}
        title={`${REPORT_REASON_LABELS[report.reason] || report.reason} · ${report.target_type}`}
        description={`Filed ${formatDateTime(report.created_at)} by ${
          report.reporter ? `@${report.reporter.username}` : "a deleted member"
        }`}
        actions={
          <div className="admin-toolbar">
            <StatusBadge status={report.status} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={refresh} disabled={loading}>
              <RefreshCw size={15} aria-hidden="true" className={loading ? "is-spinning" : ""} />
              Refresh
            </button>
          </div>
        }
      />

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      <div className="admin-report-grid">
        <div className="admin-report-main">
          <SectionPanel title="Reported content" description={`${report.target_type} #${report.target_id}`}>
            {report.target ? (
              <div className="admin-report-target">
                <div className="admin-report-target__head">
                  <span className="admin-type-tag">{report.target_type}</span>
                  <StatusBadge status={report.target.status} />
                  {report.target.available === false && (
                    <span className="admin-badge admin-badge--neutral">No longer available</span>
                  )}
                </div>
                {report.target.author && (
                  <p className="admin-report-target__author">
                    By <strong>{report.target.author.name}</strong> @{report.target.author.username}
                  </p>
                )}
                <blockquote className="admin-report-target__content">
                  {report.target.title && <strong>{report.target.title}</strong>}
                  {report.target.content || <span className="admin-muted">No text captured.</span>}
                </blockquote>
                <div className="admin-report-target__links">
                  {targetLink && (
                    <Link className="admin-text-link" to={targetLink}>
                      Open in moderation <ExternalLink size={13} aria-hidden="true" />
                    </Link>
                  )}
                  {report.target.url && (
                    <Link className="admin-text-link" to={report.target.url}>
                      Public view <ExternalLink size={13} aria-hidden="true" />
                    </Link>
                  )}
                  {report.target_author_account && (
                    <Link className="admin-text-link" to={`/admin/users/${report.target_author_account.id}`}>
                      Member record <ExternalLink size={13} aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <p className="admin-empty-note">This content is no longer available.</p>
            )}
          </SectionPanel>

          <SectionPanel title="Report details">
            <dl className="admin-detail-list">
              <div>
                <dt>Reason</dt>
                <dd>{REPORT_REASON_LABELS[report.reason] || report.reason}</dd>
              </div>
              <div>
                <dt>Reporter note</dt>
                <dd>{report.details || "—"}</dd>
              </div>
              <div>
                <dt>Snapshot at report time</dt>
                <dd>{report.content_snapshot || "—"}</dd>
              </div>
              <div>
                <dt>Filed</dt>
                <dd>{formatDateTime(report.created_at)}</dd>
              </div>
              {report.reviewed_at && (
                <div>
                  <dt>Last decision</dt>
                  <dd>
                    {formatDateTime(report.reviewed_at)}
                    {report.reviewed_by ? ` · @${report.reviewed_by.username}` : ""}
                  </dd>
                </div>
              )}
              {report.resolution_note && (
                <div>
                  <dt>Resolution note</dt>
                  <dd>{report.resolution_note}</dd>
                </div>
              )}
              {report.resolution_action && report.resolution_action !== "none" && (
                <div>
                  <dt>Action taken</dt>
                  <dd>{ACTION_LABELS[report.resolution_action] || report.resolution_action}</dd>
                </div>
              )}
            </dl>
          </SectionPanel>

          {closed && (
            <SectionPanel title="Decision recorded" description="This report is closed and cannot be reopened.">
              <div className={`admin-decision admin-decision--${report.status}`}>
                {report.status === "resolved" ? (
                  <CheckCircle2 size={20} aria-hidden="true" />
                ) : (
                  <XCircle size={20} aria-hidden="true" />
                )}
                <div>
                  <strong>{report.status === "resolved" ? "Resolved" : "Dismissed"}</strong>
                  <p>{report.resolution_note || "No note recorded."}</p>
                  <small>
                    {report.reviewed_by ? `Decided by @${report.reviewed_by.username}` : "Decision recorded"} ·{" "}
                    {timeAgo(report.reviewed_at)}
                  </small>
                </div>
              </div>
            </SectionPanel>
          )}
        </div>

        <aside className="admin-report-side">
          {canManage && !closed && (
            <SectionPanel title="Take action" description="Every decision is written to the audit log and the reporter is notified.">
              {report.status === "pending" && (
                <button type="button" className="btn btn-secondary btn-block" onClick={markUnderReview} disabled={busy}>
                  <Flag size={15} aria-hidden="true" />
                  Mark under review
                </button>
              )}

              <label className="admin-field">
                <span>Resolution note (required to close)</span>
                <textarea
                  className="textarea"
                  rows={4}
                  maxLength={2000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="What did you find, and why are you closing this report?"
                />
              </label>

              <label className="admin-field">
                <span>Content / account action</span>
                <select className="input admin-select" value={action} onChange={(event) => setAction(event.target.value)}>
                  {actionOptions.map((value) => (
                    <option key={value} value={value}>
                      {ACTION_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="admin-decision-actions">
                <button type="button" className="btn btn-primary btn-block" onClick={() => requestClose("resolved")} disabled={busy}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  Resolve report
                </button>
                <button type="button" className="btn btn-outline btn-block" onClick={() => requestClose("dismissed")} disabled={busy}>
                  <Undo2 size={15} aria-hidden="true" />
                  Dismiss report
                </button>
              </div>
              <p className="admin-footnote">Dismiss reports that do not violate the community guidelines.</p>
            </SectionPanel>
          )}

          <SectionPanel title="People">
            <dl className="admin-detail-list">
              <div>
                <dt>Reporter</dt>
                <dd>
                  {report.reporter ? (
                    <Link className="admin-text-link" to={`/admin/users/${report.reporter.id}`}>
                      @{report.reporter.username}
                    </Link>
                  ) : (
                    "Deleted member"
                  )}
                </dd>
              </div>
              <div>
                <dt>Reported account</dt>
                <dd>
                  {report.target_author_account ? (
                    <>
                      <Link className="admin-text-link" to={`/admin/users/${report.target_author_account.id}`}>
                        @{report.target_author_account.username}
                      </Link>
                      <StatusBadge status={report.target_author_account.account_status} />
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          </SectionPanel>

          <SectionPanel title="Prior reports on this content">
            <ul className="admin-record-list">
              {(report.history || []).map((entry) => (
                <li key={entry.id}>
                  <Link to={`/admin/reports/${entry.id}`}>
                    <span>
                      <strong>{REPORT_REASON_LABELS[entry.reason] || entry.reason}</strong>
                      <small>
                        {entry.reporter ? `@${entry.reporter.username}` : "Deleted member"} · {timeAgo(entry.created_at)}
                      </small>
                    </span>
                    <StatusBadge status={entry.status} />
                  </Link>
                </li>
              ))}
              {!(report.history || []).length && <li className="admin-empty-note">No other reports on this content.</li>}
            </ul>
          </SectionPanel>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(decision)}
        title={decision?.status === "resolved" ? "Resolve this report?" : "Dismiss this report?"}
        description={
          decision?.status === "resolved"
            ? "The reporter is notified and the decision is recorded in the audit log."
            : "The reporter is notified that no action was taken. This closes the report."
        }
        confirmLabel={decision?.status === "resolved" ? "Resolve report" : "Dismiss report"}
        tone={decision?.status === "resolved" ? "danger" : "primary"}
        busy={busy}
        onConfirm={() => decision && applyUpdate(decision)}
        onClose={() => !busy && setDecision(null)}
      >
        {decision && (
          <div className="admin-dialog-summary">
            <p>{truncate(decision.resolution_note, 240)}</p>
            <p className="admin-footnote">
              Action: {ACTION_LABELS[decision.resolution_action] || decision.resolution_action}
            </p>
          </div>
        )}
      </ConfirmDialog>
    </AdminShell>
  );
}
