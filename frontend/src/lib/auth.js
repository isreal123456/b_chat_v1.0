export function isAuthenticated(user) {
  return Boolean(user?.id)
}

export function getDisplayName(user) {
  return user?.name || user?.username || 'Anonymous'
}
