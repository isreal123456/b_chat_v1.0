import { createContext, createElement, useContext, useMemo, useState } from 'react'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [user, setUser] = useState({
    id: 1,
    username: 'maya',
    name: 'Maya Chen',
    bio: 'Building products with design systems, frontend craft, and a little curiosity.',
    followers: 18420,
    following: 812,
  })

  const value = useMemo(() => ({ user, setUser }), [user])

  return createElement(UserContext.Provider, { value }, children)
}

export function useUserStore() {
  const context = useContext(UserContext)

  if (!context) {
    throw new Error('useUserStore must be used inside UserProvider')
  }

  return context
}
