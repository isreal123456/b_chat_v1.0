import { useMemo } from 'react'

const demoPosts = [
  {
    id: 1,
    author: 'Ari',
    handle: '@ari',
    time: '2m',
    body: 'Shipped the first pass of the new onboarding flow. Tiny UX details made the biggest difference.',
    likes: 128,
    comments: 14,
    shares: 6,
    tags: ['ui', 'product'],
  },
  {
    id: 2,
    author: 'Noah',
    handle: '@noah',
    time: '18m',
    body: 'Exploring how to keep social activity feeds useful without becoming noisy. Filtering helps a lot.',
    likes: 84,
    comments: 9,
    shares: 3,
    tags: ['frontend', 'ux'],
  },
]

export function usePosts() {
  return useMemo(() => demoPosts, [])
}
