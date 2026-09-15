export default function SearchBar() {
  return (
    <label className="search-bar">
      <span className="search-bar__icon" aria-hidden="true">⌕</span>
      <input type="search" placeholder="Search people, posts, or communities" />
    </label>
  )
}
