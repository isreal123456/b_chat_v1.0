const defaultHeaders = {
  'Content-Type': 'application/json',
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export function getAccessToken() {
  return localStorage.getItem('access_token')
}

export async function api(path, options = {}) {
  const token = getAccessToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json()
}
