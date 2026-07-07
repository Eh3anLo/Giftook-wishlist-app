import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth.js'
import { getWishlistsByUser } from '@/services/wishlist.service.js'
import WishlistGrid from '@/components/wishlist/WishlistGrid'

/**
 * WishlistsPage — Server Component.
 * Fetches the authenticated user's wishlists and renders them in a grid.
 * Includes a "لیست جدید" create button.
 */
export const metadata = {
  title: 'لیست‌های آرزو',
}

export default async function WishlistsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const { wishlists } = await getWishlistsByUser(session.user.id, { page: 1, pageSize: 50 })

  return (
    <div dir="rtl" className="mx-auto max-w-5xl">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">لیست‌های آرزو</h1>
        <Link
          href="/wishlists/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span aria-hidden="true">+</span>
          لیست جدید
        </Link>
      </div>

      {/* Wishlist grid */}
      <WishlistGrid wishlists={wishlists} />
    </div>
  )
}
