export default function Button({
  type = 'button',
  variant = 'solid',
  className = '',
  children,
  ...props
}) {
  const classes = [
    'button',
    variant === 'ghost' ? 'button--ghost' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  )
}
