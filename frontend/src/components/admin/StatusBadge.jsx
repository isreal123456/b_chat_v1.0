import { statusTone } from "../../lib/adminFormat";

const LABELS = {
  active: "Active",
  suspended: "Suspended",
  published: "Published",
  removed: "Removed",
  pending: "Pending",
  under_review: "Under review",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export default function StatusBadge({ status, label }) {
  const tone = statusTone(status);
  return (
    <span className={`admin-badge admin-badge--${tone}`}>
      <span className="admin-badge__dot" aria-hidden="true" />
      {label || LABELS[status] || status}
    </span>
  );
}
