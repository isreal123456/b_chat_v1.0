export const PROJECT_STATUSES = [
  { value: "in_progress", label: "In progress" },
  { value: "shipped", label: "Shipped" },
  { value: "archived", label: "Archived" },
];

export function statusLabel(status) {
  return PROJECT_STATUSES.find((item) => item.value === status)?.label || "In progress";
}

export const PROJECT_CATEGORIES = [
  { value: "", label: "All projects" },
  { value: "developer", label: "Developer" },
  { value: "designer", label: "Designer" },
];

export function formatMonthYear(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}
