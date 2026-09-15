import SearchBar from './SearchBar'

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Explore', href: '/explore' },
  { label: 'Messages', href: '/messages' },
  { label: 'Settings', href: '/settings' },
]

export default function TopNav({ pathname }) {
  return (
    <header className="top-nav">
      <div>
        <p className="eyebrow">Bchat</p>
        <h1>Build in public with people who care.</h1>
      </div>
      <SearchBar />
      <nav className="top-nav__links" aria-label="Primary">
        {navItems.map((item) => (
          <a key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  )
}
