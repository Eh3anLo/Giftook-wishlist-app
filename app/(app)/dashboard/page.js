import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth.js'
import { getWishlistsByUser } from '@/services/wishlist.service.js'
import { getUserStats } from '@/services/stats.service.js'
import WishlistGrid from '@/components/wishlist/WishlistGrid'
import StatsOverview from '@/components/dashboard/StatsOverview'

/**
 * DashboardPage — Server Component.
 * Fetches the authenticated user's wishlists (paginated, 20 per page)
 * and renders them in a grid. Supports ?page=N URL param for pagination.
 * Shows an empty state with a "ایجاد اولین لیست" CTA when no wishlists exist.
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

  const [{ wishlists, total }, stats] = await Promise.all([
    getWishlistsByUser(session.user.id, { page, pageSize: PAGE_SIZE }),
    getUserStats(session.user.id),
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

      {/* Stats overview — only shown when there's at least one wishlist */}
      {total > 0 && <StatsOverview stats={stats} />}

      {/* Wishlist grid with pagination */}
      <WishlistGrid
        wishlists={wishlists}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        emptyMessage="هنوز لیستی نساخته‌اید."
        emptyAction={{ label: 'ایجاد اولین لیست', href: '/wishlists/new' }}
      />
    </div>
  )
}