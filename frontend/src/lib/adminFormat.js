const numberFormatter = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
const fullNumberFormatter = new Intl.NumberFormat();

export function formatNumber(value) {
  return numberFormatter.format(Number(value) || 0);
}

export function formatFullNumber(value) {
  return fullNumberFormatter.format(Number(value) || 0);
}

export function formatDate(value, options = {}) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)}h ago`;
  if (diffMinutes < 10080) return `${Math.round(diffMinutes / 1440)}d ago`;
  return formatDate(value);
}

export function shortDay(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function truncate(value, length = 120) {
  const text = String(value || "").trim();
  return text.length > length ? `${text.slice(0, length).trim()}…` : text;
}

export const ROLE_LABELS = {
  user: "Member",
  moderator: "Moderator",
  admin: "Admin",
  super_admin: "Super Admin",
};

export const REPORT_REASON_LABELS = {
  spam: "Spam",
  harassment: "Harassment",
  hate_speech: "Hate speech",
  misinformation: "Misinformation",
  inappropriate: "Inappropriate",
  impersonation: "Impersonation",
  other: "Other",
};

export const ACTION_LABELS = {
  "user.update": "Profile updated",
  "user.suspend": "Member suspended",
  "user.restore": "Member restored",
  "user.delete": "Member deleted",
  "role.change": "Role changed",
  "content.remove": "Content removed",
  "content.restore": "Content restored",
  "content.auto_hide": "Content auto-hidden",
  "report.review": "Report under review",
  "report.resolve": "Report resolved",
  "report.dismiss": "Report dismissed",
  "project.feature": "Project featured",
  "project.unfeature": "Project unfeatured",
  "settings.update": "Settings updated",
};

export function actionLabel(action) {
  return ACTION_LABELS[action] || action;
}

export function statusTone(status) {
  if (["active", "published", "resolved"].includes(status)) return "success";
  if (["pending", "under_review"].includes(status)) return "warning";
  if (["suspended", "removed", "dismissed"].includes(status)) return "danger";
  return "neutral";
}
