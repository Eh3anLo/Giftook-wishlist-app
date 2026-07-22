import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth.js'
import { getWishlistsByUser } from '@/services/wishlist.service.js'
import { getUserStats } from '@/services/stats.service.js'
import { getUpcomingFriendBirthdays } from '@/services/birthday.service.js'
import WishlistGrid from '@/components/wishlist/WishlistGrid'
import StatsOverview from '@/components/dashboard/StatsOverview'
import UpcomingBirthdays from '@/components/dashboard/UpcomingBirthdays'

/**
 * DashboardPage — Server Component.
 * Fetches the authenticated user's wishlists (paginated, 20 per page)
 * and renders them in a grid. Supports ?page=N and ?status=active|archived
 * URL params. Shows an empty state with a "ایجاد اولین لیست" CTA when no
 * active wishlists exist. Also shows friends' upcoming birthdays, soonest
 * first, when the active/friends tab is shown.
 */
export const metadata = {
  title: 'داشبورد',
}

const PAGE_SIZE = 20

export default async function DashboardPage({ searchParams }) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  // searchParams may be a Promise in Next.js 15 — await it safely
  const resolvedParams = await searchParams
  const page = Math.max(1, parseInt(resolvedParams?.page ?? '1', 10) || 1)
  const status = resolvedParams?.status === 'archived' ? 'archived' : 'active'

  const [{ wishlists, total }, stats, upcomingBirthdays] = await Promise.all([
    getWishlistsByUser(session.user.id, { page, pageSize: PAGE_SIZE, status }),
    getUserStats(session.user.id),
    status === 'active' ? getUpcomingFriendBirthdays(session.user.id, { withinDays: 30 }) : [],
  ])

  return (
    <div dir="rtl" className="mx-auto max-w-5xl">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">داشبورد</h1>
        <Link
          href="/wishlists/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span aria-hidden="true">+</span>
          لیست جدید
        </Link>
      </div>

      {/* Friends' upcoming birthdays — only on the active tab */}
      {status === 'active' && <UpcomingBirthdays birthdays={upcomingBirthdays} />}

      {/* Stats overview — only on the active tab, only when there's at least one wishlist */}
      {status === 'active' && stats.wishlistCount > 0 && <StatsOverview stats={stats} />}

      {/* Active / Archived tabs */}
      <div className="mb-4 flex gap-1 border-b border-border">
        <Link
          href="?status=active"
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            status === 'active'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          فعال
        </Link>
        <Link
          href="?status=archived"
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            status === 'archived'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          آرشیوشده
        </Link>
      </div>

      {/* Wishlist grid with pagination */}
      <WishlistGrid
        wishlists={wishlists}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        extraQuery={{ status }}
        emptyMessage={
          status === 'archived' ? 'هیچ لیست آرشیوشده‌ای نداری.' : 'هنوز لیستی نساخته‌اید.'
        }
        emptyAction={
          status === 'archived' ? undefined : { label: 'ایجاد اولین لیست', href: '/wishlists/new' }
        }
      />
    </div>
  )
}