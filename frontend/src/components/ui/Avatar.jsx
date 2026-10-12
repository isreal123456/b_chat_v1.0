import { useState } from 'react'

export default function Avatar({ name, src, size = 48 }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const fallback = name
    ?.split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="avatar" style={{ width: size, height: size }}>
      {src && failedSrc !== src ? <img src={src} alt={name || 'Avatar'} onError={() => setFailedSrc(src)} /> : <span>{fallback}</span>}
    </div>
  )
}
