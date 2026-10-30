import { api } from "./api";

function toQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === false) return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function hasAdminPermission(user, permission) {
  if (!user?.admin_role) return false;
  const permissions = Array.isArray(user.admin_permissions) ? user.admin_permissions : [];
  return !permission || permissions.includes(permission);
}

// Overview & analytics
export const fetchAdminOverview = () => api("/admin/overview");
export const fetchAdminActivityChart = (days = 30) =>
  api(`/admin/overview/activity?days=${days}`);
export const fetchAdminAnalytics = (range = "30d") =>
  api(`/admin/analytics?range=${range}`);
export const fetchAdminActivity = (params) =>
  api(`/admin/activity${toQuery(params)}`);

// Members
export const fetchAdminUsers = (params) => api(`/admin/users${toQuery(params)}`);
export const fetchAdminUser = (id) => api(`/admin/users/${id}`);
export const updateAdminUser = (id, payload) =>
  api(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const suspendAdminUser = (id, reason) =>
  api(`/admin/users/${id}/suspend`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
export const restoreAdminUser = (id) =>
  api(`/admin/users/${id}/restore`, { method: "POST" });
export const deleteAdminUser = (id, payload) =>
  api(`/admin/users/${id}`, { method: "DELETE", body: JSON.stringify(payload) });
export const updateAdminUserRole = (id, role) =>
  api(`/admin/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
export const fetchAdminTeam = () => api("/admin/admins");

// Content
export const fetchAdminPosts = (params) => api(`/admin/posts${toQuery(params)}`);
export const fetchAdminPost = (id) => api(`/admin/posts/${id}`);
export const removeAdminPost = (id, reason) =>
  api(`/admin/posts/${id}/remove`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
export const restoreAdminPost = (id) =>
  api(`/admin/posts/${id}/restore`, { method: "POST" });

export const fetchAdminComments = (params) =>
  api(`/admin/comments${toQuery(params)}`);
export const removeAdminComment = (id, reason) =>
  api(`/admin/comments/${id}/remove`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
export const restoreAdminComment = (id) =>
  api(`/admin/comments/${id}/restore`, { method: "POST" });

// Reports
export const fetchAdminReports = (params) =>
  api(`/admin/reports${toQuery(params)}`);
export const fetchAdminReport = (id) => api(`/admin/reports/${id}`);
export const updateAdminReport = (id, payload) =>
  api(`/admin/reports/${id}`, { method: "PATCH", body: JSON.stringify(payload) });

// Projects
export const fetchAdminProjects = (params) =>
  api(`/admin/projects${toQuery(params)}`);
export const fetchAdminProject = (id) => api(`/admin/projects/${id}`);
export const removeAdminProject = (id, reason) =>
  api(`/admin/projects/${id}/remove`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
export const restoreAdminProject = (id) =>
  api(`/admin/projects/${id}/restore`, { method: "POST" });
export const featureAdminProject = (id, featured) =>
  api(`/admin/projects/${id}/feature`, {
    method: "POST",
    body: JSON.stringify({ featured }),
  });

// Settings
export const fetchAdminSettings = () => api("/admin/settings");
export const updateAdminSettings = (payload) =>
  api("/admin/settings", { method: "PATCH", body: JSON.stringify(payload) });

// Public status & member reports
export const fetchPlatformStatus = () => api("/platform/status");
export const submitReport = (payload) =>
  api("/reports", { method: "POST", body: JSON.stringify(payload) });
