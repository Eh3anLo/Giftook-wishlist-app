"use client"

import { useState } from 'react'

/**
 * ReserveButton — Client Component.
 * Handles reserve / cancel-reservation for a single gift item.
 *
 * Props:
 *  - giftItemId (string): the gift item to reserve
 *  - reservationId (string|null): existing reservation id if the current user holds it
 *  - isReserved (bool): whether the item is already reserved by anyone
 *  - isOwnReservation (bool): whether the current user is the one who reserved it
 */
export default function ReserveButton({ giftItemId, reservationId, isReserved: initialReserved, isOwnReservation: initialIsOwn }) {
  const [isReserved, setIsReserved] = useState(initialReserved)
  const [isOwnReservation, setIsOwnReservation] = useState(initialIsOwn)
  const [currentReservationId, setCurrentReservationId] = useState(reservationId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Item reserved by someone else — show static disabled badge, no action
  if (isReserved && !isOwnReservation) {
    return (
      <span
        aria-disabled="true"
        className="inline-block cursor-default rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800"
      >
        رزرو شده
      </span>
    )
  }

  async function handleReserve() {
    setError('')
    // Optimistic update — update UI before awaiting the response
    setIsReserved(true)
    setIsOwnReservation(true)
    setLoading(true)
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftItemId }),
      })

      if (res.status === 401) {
        // Rollback optimistic update before redirecting
        setIsReserved(false)
        setIsOwnReservation(false)
        window.location.href = '/login?callbackUrl=' + encodeURIComponent(window.location.pathname)
        return
      }

      if (res.status === 409) {
        // Rollback — item was already reserved by someone else
        setIsReserved(false)
        setIsOwnReservation(false)
        setError('این هدیه قبلاً رزرو شده است.')
        return
      }

      if (!res.ok) {
        // Rollback optimistic update on any other error
        setIsReserved(false)
        setIsOwnReservation(false)
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'خطایی رخ داده است.')
        return
      }

      const data = await res.json()
      setCurrentReservationId(data.id)
    } catch {
      // Network error — rollback
      setIsReserved(false)
      setIsOwnReservation(false)
      setError('خطا در ارتباط با سرور.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelReservation() {
    if (!currentReservationId) return
    setError('')
    // Optimistic update — update UI before awaiting the response
    setIsReserved(false)
    setIsOwnReservation(false)
    setLoading(true)
    try {
      const res = await fetch(`/api/reservations/${currentReservationId}`, {
        method: 'DELETE',
      })

      if (res.status === 401) {
        // Rollback optimistic update before redirecting
        setIsReserved(true)
        setIsOwnReservation(true)
        window.location.href = '/login?callbackUrl=' + encodeURIComponent(window.location.pathname)
        return
      }

      if (!res.ok) {
        // Rollback optimistic update on error
        setIsReserved(true)
        setIsOwnReservation(true)
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'خطا در لغو رزرو.')
        return
      }

      setCurrentReservationId(null)
    } catch {
      // Network error — rollback
      setIsReserved(true)
      setIsOwnReservation(true)
      setError('خطا در ارتباط با سرور.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {isOwnReservation ? (
        <button
          type="button"
          onClick={handleCancelReservation}
          disabled={loading}
          className="rounded-md border border-destructive px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 disabled:opacity-60"
        >
          {loading ? 'در حال لغو...' : 'لغو رزرو'}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleReserve}
          disabled={loading}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60"
        >
          {loading ? 'در حال رزرو...' : 'رزرو کن'}
        </button>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
