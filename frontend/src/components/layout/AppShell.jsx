export default function AppShell({ left, center, right }) {
  return (
    <main className="app-shell">
      <aside className="app-shell__rail">{left}</aside>
      <section className="app-shell__main">{center}</section>
      <aside className="app-shell__rail app-shell__rail--right">{right}</aside>
    </main>
  )
}
