"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ConfirmDialog from '@/components/common/ConfirmDialog'

/**
 * WishlistCard — Client Component.
 * Displays a wishlist summary: title, occasion badge, visibility indicator,
 * item count, reserved count, progress bar, and quick-action buttons.
 * All labels are in Persian.
 *
 * Props:
 *  - wishlist (object): wishlist record (includes _count or itemCount/reservedCount)
 */

const OCCASION_LABELS = {
  birthday: 'تولد',
  wedding: 'عروسی',
  holiday: 'تعطیلات',
  other: 'سایر',
}

const VISIBILITY_LABELS = {
  public: 'عمومی',
  private: 'خصوصی',
  link_only: 'فقط با لینک',
}

const VISIBILITY_COLORS = {
  public: 'bg-green-100 text-green-800',
  private: 'bg-red-100 text-red-800',
  link_only: 'bg-yellow-100 text-yellow-800',
}

const OCCASION_COLORS = {
  birthday: 'bg-pink-100 text-pink-800',
  wedding: 'bg-purple-100 text-purple-800',
  holiday: 'bg-blue-100 text-blue-800',
  other: 'bg-gray-100 text-gray-800',
}

export default function WishlistCard({ wishlist }) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Support both _count.items shape (from getWishlistsByUser) and flat itemCount
  const itemCount = wishlist.itemCount ?? wishlist._count?.items ?? 0
  const reservedCount = wishlist.reservedCount ?? wishlist._count?.reservations ?? 0

  const progressPercent = itemCount > 0 ? Math.round((reservedCount / itemCount) * 100) : 0

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/wishlists/${wishlist.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <div
        dir="rtl"
        className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
      >
        {/* Header: title + badges */}
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <Link
            href={`/wishlists/${wishlist.id}`}
            className="text-base font-semibold text-foreground line-clamp-2 flex-1 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
          >
            {wishlist.title}
          </Link>

          <div className="flex flex-shrink-0 flex-wrap gap-1">
            {/* Visibility badge */}
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                VISIBILITY_COLORS[wishlist.visibility] ?? 'bg-gray-100 text-gray-800'
              }`}
            >
              {VISIBILITY_LABELS[wishlist.visibility] ?? wishlist.visibility}
            </span>

            {/* Occasion badge */}
            {wishlist.occasion && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  OCCASION_COLORS[wishlist.occasion] ?? 'bg-gray-100 text-gray-800'
                }`}
              >
                {OCCASION_LABELS[wishlist.occasion] ?? wishlist.occasion}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {wishlist.description && (
          <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{wishlist.description}</p>
        )}

        {/* Item counts */}
        <div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{itemCount}</span> آیتم
          </span>
          <span>
            <span className="font-medium text-foreground">{reservedCount}</span> رزرو شده
          </span>
        </div>

        {/* Progress bar */}
        {itemCount > 0 ? (
          <div className="mb-4 space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${reservedCount} از ${itemCount} رزرو شده`}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {reservedCount} از {itemCount} رزرو شده
            </p>
          </div>
        ) : (
          <p className="mb-4 text-xs text-muted-foreground">هنوز آیتمی اضافه نشده</p>
        )}

        {/* Quick-action controls */}
        <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
          {/* View */}
          <Link
            href={`/wishlists/${wishlist.id}`}
            className="flex-1 rounded-md bg-primary px-3 py-1.5 text-center text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            مشاهده
          </Link>

          {/* Edit */}
          <Link
            href={`/wishlists/${wishlist.id}/edit`}
            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-center text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            ویرایش
          </Link>

          {/* Delete */}
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={deleting}
            className="flex-1 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 disabled:opacity-50"
          >
            {deleting ? '...' : 'حذف'}
          </button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="حذف لیست آرزو"
        description={`آیا از حذف لیست "${wishlist.title}" مطمئن هستید؟ این عملیات قابل بازگشت نیست.`}
        confirmLabel="بله، حذف شود"
        cancelLabel="لغو"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
