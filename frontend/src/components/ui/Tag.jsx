export default function Tag({ children, className = '' }) {
  return <span className={['tag', className].filter(Boolean).join(' ')}>{children}</span>
}
