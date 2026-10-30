const defaultHeaders = {
  'Content-Type': 'application/json',
}

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

export function getMediaUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

/** Keep backend-generated action links in the app's current origin. */
export function toAppPath(url) {
  try {
    const parsed = new URL(url)
    return `${parsed.pathname}${parsed.search}`
  } catch {
    return url
  }
}

export async function fetchAuthenticatedMedia(path, signal) {
  const token = getAccessToken()
  const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal,
  })

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('access_token')
      if (window.location.pathname !== '/login') window.location.assign('/login')
    }
    throw new Error(response.status === 404 ? 'Image not found' : `Could not load image (status ${response.status})`)
  }

  return URL.createObjectURL(await response.blob())
}

export function getAccessToken() {
  return localStorage.getItem('access_token')
}

export async function api(path, options = {}) {
  const token = getAccessToken()
  const isFormData = options.body instanceof FormData
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : defaultHeaders),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) {
      localStorage.removeItem('access_token')
      if (window.location.pathname !== '/login') window.location.assign('/login')
    }
    const payload = await response.json().catch(() => null)
    const detail = typeof payload?.detail === 'string'
      ? payload.detail
      : Array.isArray(payload?.detail)
        ? payload.detail.map((issue) => `${issue.loc?.at(-1) || 'Input'}: ${issue.msg}`).join('. ')
        : `Request failed with status ${response.status}`
    const error = new Error(detail)
    error.status = response.status
    if (response.status === 503) {
      error.maintenance = true
      if (!window.location.pathname.startsWith("/maintenance")) {
        window.location.assign("/maintenance")
      }
    }
    throw error
  }

  if (response.status === 204) return null
  return response.json()
}

export function fetchFeed({ limit = 10, offset = 0 } = {}) {
  return api(`/posts/all_posts?limit=${limit}&offset=${offset}`)
}

export function fetchUserPosts(username, { limit = 20, offset = 0 } = {}) {
  return api(`/posts/all_posts?author=${encodeURIComponent(username)}&limit=${limit}&offset=${offset}`)
}

export function createPost(content, attachment = null, projectId = null) {
  if (attachment) {
    const body = new FormData()
    body.append('content', content)
    if (projectId) body.append('project_id', String(projectId))
    if (attachment.type.startsWith('video/')) {
      body.append('video', attachment)
      return api('/posts/with-video', { method: 'POST', body })
    }
    body.append('image', attachment)
    return api('/posts/with-image', { method: 'POST', body })
  }

  return api('/posts', {
    method: 'POST',
    body: JSON.stringify({ content, project_id: projectId || null }),
  })
}

// ── Reposts & bookmarks ──────────────────────────────────────────────────────
export function repostPost(postId) {
  return api(`/shares/${postId}`, { method: 'POST' })
}

export function unrepostPost(postId) {
  return api(`/shares/${postId}`, { method: 'DELETE' })
}

export function savePost(postId) {
  return api(`/saves/${postId}`, { method: 'POST' })
}

export function unsavePost(postId) {
  return api(`/saves/${postId}`, { method: 'DELETE' })
}

export function fetchSavedPosts({ limit = 20, offset = 0 } = {}) {
  return api(`/saves?limit=${limit}&offset=${offset}`)
}

// ── Ticks ────────────────────────────────────────────────────────────────────
/** Tick a post. Resolves with the new Tick record. */
export function tickPost(postId) {
  return api(`/ticks/${postId}`, { method: 'POST' })
}

/** Remove a Tick from a post. */
export function untickPost(postId) {
  return api(`/ticks/${postId}`, { method: 'DELETE' })
}

/** Get the list of users who ticked a post. */
export function fetchWhoTicked(postId) {
  return api(`/ticks/${postId}/who`)
}

export function fetchTickCount(postId) {
  return api(`/ticks/${postId}/count`)
}

// ── Social ───────────────────────────────────────────────────────────────────
export function fetchFriends() {
  return api('/friends')
}

export function searchUsers(query = '', limit = 20) {
  return api(`/users/search?query=${encodeURIComponent(query)}&limit=${limit}`)
}

// ── Discovery ────────────────────────────────────────────────────────────────
export function fetchSuggestedPeople({ limit = 6 } = {}) {
  return api(`/discovery/suggested-people?limit=${limit}`)
}

export function fetchTrendingPosts({ days = 7, limit = 5 } = {}) {
  return api(`/discovery/trending?days=${days}&limit=${limit}`)
}

export function fetchTrendingSkills({ limit = 8 } = {}) {
  return api(`/discovery/trending-skills?limit=${limit}`)
}

export function fetchProfile(username) {
  return api(`/users/${encodeURIComponent(username)}`)
}

export function followUser(userId) {
  return api(`/users/${userId}/follow`, { method: 'POST' })
}

export function unfollowUser(userId) {
  return api(`/users/${userId}/follow`, { method: 'DELETE' })
}

export function fetchFollowers(username, { limit = 20, offset = 0 } = {}) {
  return api(`/users/${encodeURIComponent(username)}/followers?limit=${limit}&offset=${offset}`)
}

export function fetchFollowing(username, { limit = 20, offset = 0 } = {}) {
  return api(`/users/${encodeURIComponent(username)}/following?limit=${limit}&offset=${offset}`)
}

export function fetchConversations() {
  return api('/conversations')
}

// ── Projects ─────────────────────────────────────────────────────────────────
export function fetchProjects({ query = '', category = '', status = '', username = '', limit = 12, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  if (query.trim()) params.set('query', query.trim())
  if (category) params.set('category', category)
  if (status) params.set('status', status)
  if (username) params.set('username', username)
  return api(`/projects?${params.toString()}`)
}

export function fetchUserProjects(username, { limit = 12, offset = 0 } = {}) {
  return api(`/users/${encodeURIComponent(username)}/projects?limit=${limit}&offset=${offset}`)
}

export function fetchProject(projectId) {
  return api(`/projects/${projectId}`)
}

export function createProject(payload) {
  return api('/projects', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateProject(projectId, payload) {
  return api(`/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export function deleteProject(projectId) {
  return api(`/projects/${projectId}`, { method: 'DELETE' })
}

export function uploadProjectCover(projectId, file) {
  const body = new FormData()
  body.append('image', file)
  return api(`/projects/${projectId}/cover`, { method: 'PUT', body })
}

export function deleteProjectCover(projectId) {
  return api(`/projects/${projectId}/cover`, { method: 'DELETE' })
}

// ── Build Together ───────────────────────────────────────────────────────────
export function sendCollaborationRequest(projectId, payload = {}) {
  return api(`/projects/${projectId}/collaboration-requests`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchProjectCollaborationRequests(projectId) {
  return api(`/projects/${projectId}/collaboration-requests`)
}

export function fetchReceivedCollaborationRequests() {
  return api('/collaboration-requests/received')
}

export function fetchSentCollaborationRequests() {
  return api('/collaboration-requests/sent')
}

export function acceptCollaborationRequest(projectId, requestId) {
  return api(`/projects/${projectId}/collaboration-requests/${requestId}/accept`, { method: 'PATCH' })
}

export function rejectCollaborationRequest(projectId, requestId) {
  return api(`/projects/${projectId}/collaboration-requests/${requestId}/reject`, { method: 'PATCH' })
}

export function cancelCollaborationRequest(projectId, requestId) {
  return api(`/projects/${projectId}/collaboration-requests/${requestId}`, { method: 'DELETE' })
}

export function fetchProjectCollaborators(projectId) {
  return api(`/projects/${projectId}/collaborators`)
}

export function removeProjectCollaborator(projectId, userId) {
  return api(`/projects/${projectId}/collaborators/${userId}`, { method: 'DELETE' })
}
