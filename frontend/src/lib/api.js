const defaultHeaders = {
  'Content-Type': 'application/json',
}

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

export function getMediaUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
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
    throw error
  }

  if (response.status === 204) return null
  return response.json()
}

export function fetchPosts() {
  return api('/posts/all_posts')
}

export function createPost(content, attachment = null) {
  if (attachment) {
    const body = new FormData()
    body.append('content', content)
    if (attachment.type.startsWith('video/')) {
      body.append('video', attachment)
      return api('/posts/with-video', { method: 'POST', body })
    }
    body.append('image', attachment)
    return api('/posts/with-image', { method: 'POST', body })
  }

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
