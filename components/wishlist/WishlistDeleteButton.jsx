"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmDialog from '@/components/common/ConfirmDialog'

/**
 * WishlistDeleteButton — Client Component.
 * Renders a "حذف" button that triggers a ConfirmDialog before deleting.
 * When the wishlist has active reservations, shows an extra Persian warning.
 *
 * Props:
 *  - wishlistId (string): ID of the wishlist to delete
 *  - hasReservations (bool): whether the wishlist has active reservations (Requirement 5.7)
 */
export default function WishlistDeleteButton({ wishlistId, hasReservations }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const description = hasReservations
    ? 'این لیست دارای رزروهای فعال است. حذف لیست، تمام رزروها را نیز حذف خواهد کرد.'
    : 'آیا از حذف این لیست مطمئن هستید؟ این عملیات غیرقابل بازگشت است.'

  async function handleConfirm() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/wishlists/${wishlistId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'خطا در حذف لیست. لطفاً دوباره تلاش کنید.')
        setOpen(false)
        return
      }

      router.push('/wishlists')
      router.refresh()
    } catch {
      setError('خطا در ارتباط با سرور.')
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={loading}
        className="inline-flex items-center rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 disabled:opacity-60"
      >
        حذف
      </button>

      {error && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={open}
        title="حذف لیست آرزو"
        description={description}
        confirmLabel="حذف"
        cancelLabel="لغو"
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
