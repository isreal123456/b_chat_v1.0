import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function usePreferences() {
  const [preferences, setPreferences] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api('/users/me/preferences')
      .then((data) => { if (active) setPreferences(data) })
      .catch((requestError) => { if (active) setError(requestError.message || 'Could not load preferences.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const update = async (key, value) => {
    if (!preferences || saving) return
    const previous = preferences
    const next = { ...previous, [key]: value }
    setPreferences(next)
    setSaving(true)
    setError('')
    try {
      const saved = await api('/users/me/preferences', { method: 'PUT', body: JSON.stringify(next) })
      setPreferences(saved)
    } catch (requestError) {
      setPreferences(previous)
      setError(requestError.message || 'Could not save preferences.')
    } finally { setSaving(false) }
  }

  return { preferences, loading, saving, error, update }
}
