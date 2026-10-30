import { useCallback, useEffect, useState } from 'react'
import { createPost, fetchFeed } from '../lib/api'

const PAGE_SIZE = 10

export function usePosts() {
  const [posts, setPosts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    fetchFeed({ limit: PAGE_SIZE, offset: 0 })
      .then((data) => {
        if (!active) return
        setPosts(data.items || [])
        setTotal(data.total || 0)
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

  const loadMore = useCallback(async () => {
    setLoadingMore(true)
    setError(null)
    try {
      const data = await fetchFeed({ limit: PAGE_SIZE, offset: posts.length })
      setPosts((current) => [...current, ...(data.items || [])])
      setTotal(data.total || 0)
    } catch (requestError) {
      setError(requestError)
    } finally {
      setLoadingMore(false)
    }
  }, [posts.length])

  const addPost = async (content, attachment = null, projectId = null) => {
    const post = await createPost(content, attachment, projectId)
    setPosts((currentPosts) => [post, ...currentPosts])
    setTotal((current) => current + 1)
    return post
  }

  return {
    posts,
    total,
    loading,
    loadingMore,
    error,
    hasMore: posts.length < total,
    loadMore,
    addPost,
  }
}
