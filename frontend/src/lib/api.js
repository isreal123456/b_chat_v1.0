const defaultHeaders = {
  'Content-Type': 'application/json',
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export function getMediaUrl(path) {
  return path ? `${API_BASE_URL}${path}` : ''
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
    const payload = await response.json().catch(() => null)
    const detail = typeof payload?.detail === 'string'
      ? payload.detail
      : `Request failed with status ${response.status}`
    const error = new Error(detail)
    error.status = response.status
    throw error
  }

  if (response.status === 204) return null
  return response.json()
}

export function fetchPosts() {
  return api('/posts/all_posts')
}

export function createPost(content) {
  return api('/posts', {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export function fetchFriends() {
  return api('/friends')
}

export function searchUsers(query = '') {
  return api(`/users/search?query=${encodeURIComponent(query)}`)
}

export function fetchProfile(username) {
  return api(`/users/${encodeURIComponent(username)}`)
}

export function fetchConversations() {
  return api('/conversations')
}
