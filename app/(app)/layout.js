import { redirect } from "next/navigation"
import { auth } from "@/lib/auth.js"
import Navbar from "@/components/layout/Navbar"
import Sidebar from "@/components/layout/Sidebar"
import Footer from "@/components/layout/Footer"
import MobileNav from "@/components/layout/MobileNav"

/**
 * Server Component — authenticated app shell layout.
 * Fetches the session and redirects unauthenticated users to /login.
 * Renders Navbar at the top, Sidebar on the right (RTL) for sm+ screens,
 * MobileNav at the bottom for mobile screens, and page content in the main area.
 */
export default async function AppLayout({ children }) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen flex-col" dir="rtl">
      {/* Top navigation bar */}
      <Navbar session={session} />

      {/* Body: sidebar + main content */}
      <div className="flex flex-1">
        {/* Sidebar — hidden on mobile, visible on sm+ screens.
            In RTL flex the first child renders on the right. */}
        <div className="hidden sm:flex">
          <Sidebar />
        </div>

        {/* Page content — extra bottom padding on mobile so content clears the MobileNav */}
        <main className="flex-1 overflow-auto p-4 pb-20 sm:p-6 sm:pb-6">{children}</main>
      </div>

      {/* Footer — hidden on mobile (MobileNav takes that space) */}
      <div className="hidden sm:block">
        <Footer />
      </div>

      {/* Mobile bottom navigation — visible only on mobile */}
      <MobileNav />
    </div>
  )
}
