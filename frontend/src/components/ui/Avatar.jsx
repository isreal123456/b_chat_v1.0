export default function Avatar({ name, src, size = 48 }) {
  const fallback = name
    ?.split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="avatar" style={{ width: size, height: size }}>
      {src ? <img src={src} alt={name || 'Avatar'} /> : <span>{fallback}</span>}
    </div>
  )
}
