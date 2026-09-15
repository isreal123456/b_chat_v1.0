import { useState } from 'react'

export function useFollow(initialFollowed = false) {
  const [followed, setFollowed] = useState(initialFollowed)

  function toggleFollow() {
    setFollowed((value) => !value)
  }

  return { followed, toggleFollow }
}
