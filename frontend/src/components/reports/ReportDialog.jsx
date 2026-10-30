import { useState } from "react";

import ConfirmDialog from "../admin/ConfirmDialog";
import { REPORT_REASON_LABELS } from "../../lib/adminFormat";
import { submitReport } from "../../lib/admin";

const TARGET_LABELS = {
  post: "post",
  comment: "comment",
  user: "member",
  project: "project",
};

const REASONS = Object.entries(REPORT_REASON_LABELS);

export default function ReportDialog({ targetType, targetId, targetLabel = "", onClose }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!reason || busy) return;
    setBusy(true);
    setError("");
    try {
      await submitReport({
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details.trim(),
      });
      setSubmitted(true);
    } catch (requestError) {
      setError(
        requestError.status === 409
          ? "You already have an open report for this item. Our team is on it."
          : requestError.message || "Could not send your report. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      open
      title={`Report this ${TARGET_LABELS[targetType] || "item"}`}
      description={targetLabel ? `“${targetLabel}”` : "Reports are private and reviewed by the moderation team."}
      confirmLabel={submitted ? "Done" : "Submit report"}
      busy={busy}
      hideCancel={submitted}
      confirmDisabled={!submitted && !reason}
      onConfirm={submitted ? onClose : handleSubmit}
      onClose={onClose}
    >
      {submitted ? (
        <div className="alert alert--success" role="status">
          <div>
            <strong>Thanks for flagging this.</strong>
            <p style={{ marginTop: 2 }}>
              Our moderation team will review it. You’ll get a notification when the report is resolved.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="field">
            <label className="label" htmlFor="report-reason">Reason</label>
            <select
              id="report-reason"
              className="select"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={busy}
            >
              <option value="">Choose a reason…</option>
              {REASONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="report-details">Additional details (optional)</label>
            <textarea
              id="report-details"
              className="textarea"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Anything moderators should know?"
              disabled={busy}
            />
            <p className="hint">Never include passwords, tokens, or other private information.</p>
          </div>

          {error && <div className="alert alert--error" role="alert">{error}</div>}
        </>
      )}
    </ConfirmDialog>
  );
}
