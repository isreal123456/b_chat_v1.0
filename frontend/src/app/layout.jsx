import '../index.css'
import { UserProvider } from '../store/userStore'

export default function Layout({ children }) {
  return (
    <html lang="en">
      <body>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  )
}
