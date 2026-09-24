import { useEffect, useState } from 'react'
import { createPost, fetchPosts } from '../lib/api'

export function usePosts() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    fetchPosts()
      .then((data) => {
        if (active) setPosts(Array.isArray(data) ? data : [])
      })
      .catch((requestError) => {
        if (active) setError(requestError)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const addPost = async (content) => {
    const post = await createPost(content)
    setPosts((currentPosts) => [post, ...currentPosts])
    return post
  }

  return { posts, loading, error, addPost }
}
