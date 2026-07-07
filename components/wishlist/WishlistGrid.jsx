import Link from 'next/link'
import WishlistCard from '@/components/wishlist/WishlistCard'
import EmptyState from '@/components/common/EmptyState'

/**
 * WishlistGrid — Server Component.
 * Renders a responsive CSS grid of WishlistCard components.
 * Shows EmptyState when the list is empty.
 * Renders pagination controls below the grid when total > pageSize.
 *
 * Props:
 *  - wishlists (array): array of wishlist objects
 *  - total (number): total wishlist count for pagination
 *  - page (number): current page number (1-indexed)
 *  - pageSize (number): items per page
 *  - emptyMessage (string): optional custom empty state message
 *  - emptyAction (object): optional { label, href } for empty state CTA
 */
export default function WishlistGrid({
  wishlists = [],
  total = 0,
  page = 1,
  pageSize = 20,
  emptyMessage = 'هنوز لیستی نساخته‌اید.',
  emptyAction = { label: 'لیست جدید', href: '/wishlists/new' },
}) {
  if (!wishlists.length) {
    return <EmptyState message={emptyMessage} action={emptyAction} />
  }

  const totalPages = Math.ceil(total / pageSize)
  const hasPrev = page > 1
  const hasNext = page < totalPages
  const showPagination = total > pageSize

  return (
    <div dir="rtl">
      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {wishlists.map((wishlist) => (
          <WishlistCard key={wishlist.id} wishlist={wishlist} />
        ))}
      </div>

      {/* Pagination controls — only rendered when total > pageSize */}
      {showPagination && (
        <div className="mt-8 flex items-center justify-center gap-3" dir="rtl">
          {/* Previous page */}
          {hasPrev ? (
            <Link
              href={`?page=${page - 1}`}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              قبلی →
            </Link>
          ) : (
            <span className="rounded-md border border-input bg-muted px-4 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed opacity-50">
              قبلی →
            </span>
          )}

          {/* Page indicator */}
          <span className="text-sm text-muted-foreground">
            صفحه <span className="font-medium text-foreground">{page}</span> از{' '}
            <span className="font-medium text-foreground">{totalPages}</span>
          </span>

          {/* Next page */}
          {hasNext ? (
            <Link
              href={`?page=${page + 1}`}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              ← بعدی
            </Link>
          ) : (
            <span className="rounded-md border border-input bg-muted px-4 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed opacity-50">
              ← بعدی
            </span>
          )}
        </div>
      )}
    </div>
  )
}
