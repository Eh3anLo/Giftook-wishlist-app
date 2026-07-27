"use client"

import { useState, useEffect } from "react"
import ReservationProofForm from "@/components/gift/ReservationProofForm"

/**
 * ReserveButton — Client Component.
 * Handles reserve / cancel-reservation for a single gift item. When the
 * current user holds the reservation, also shows a toggleable form to
 * attach purchase proof (receipt image URL, shipping address, tracking code).
 *
 * Props:
 *  - giftItemId (string): the gift item to reserve
 *  - reservationId (string|null): existing reservation id if the current user holds it
 *  - isReserved (bool): whether the item is already reserved by anyone
 *  - isOwnReservation (bool): whether the current user is the one who reserved it
 *  - reservationProof (object|null): { receiptImageUrl, shippingAddress, trackingCode }
 *      for the current user's own reservation, if any
 */
export default function ReserveButton({
  giftItemId,
  reservationId,
  isReserved: initialReserved,
  isOwnReservation: initialIsOwn,
  reservationProof = null,
}) {
  const [isReserved, setIsReserved] = useState(initialReserved)
  const [isOwnReservation, setIsOwnReservation] = useState(initialIsOwn)
  const [currentReservationId, setCurrentReservationId] =
    useState(reservationId)
  const [proof, setProof] = useState(reservationProof)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [showDialog, setShowDialog] = useState(false)
  const [message, setMessage] = useState("")

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

  function handleReserve() {
    setError("")
    setShowDialog(true)
  }

  async function submitReservation() {
    setError("")

    setIsReserved(true)
    setIsOwnReservation(true)
    setLoading(true)

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          giftItemId,
          message,
        }),
      })

      if (res.status === 401) {
        setIsReserved(false)
        setIsOwnReservation(false)

        window.location.href =
          "/login?callbackUrl=" + encodeURIComponent(window.location.pathname)

        return
      }

      if (res.status === 409) {
        setIsReserved(false)
        setIsOwnReservation(false)

        setError("این هدیه قبلاً رزرو شده است.")
        return
      }

      if (!res.ok) {
        setIsReserved(false)
        setIsOwnReservation(false)

        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "خطایی رخ داده است.")
        return
      }

      const data = await res.json()

      setCurrentReservationId(data.id)
      setShowDialog(false)
      setMessage("")
    } catch {
      setIsReserved(false)
      setIsOwnReservation(false)

      setError("خطا در ارتباط با سرور.")
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelReservation() {
    if (!currentReservationId) return
    setError("")
    // Optimistic update — update UI before awaiting the response
    setIsReserved(false)
    setIsOwnReservation(false)
    setLoading(true)
    try {
      const res = await fetch(`/api/reservations/${currentReservationId}`, {
        method: "DELETE",
      })

      if (res.status === 401) {
        // Rollback optimistic update before redirecting
        setIsReserved(true)
        setIsOwnReservation(true)
        window.location.href =
          "/login?callbackUrl=" + encodeURIComponent(window.location.pathname)
        return
      }

      if (!res.ok) {
        // Rollback optimistic update on error
        setIsReserved(true)
        setIsOwnReservation(true)
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "خطا در لغو رزرو.")
        return
      }

      setCurrentReservationId(null)
      setMessage("")
      setShowDialog(false)
      setError("")
      setProof(null)
    } catch {
      // Network error — rollback
      setIsReserved(true)
      setIsOwnReservation(true)
      setError("خطا در ارتباط با سرور.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!showDialog) return

    function onKeyDown(e) {
      if (e.key === "Escape") {
        setShowDialog(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [showDialog])

  return (
    <div className="flex flex-col items-end gap-2">
      {isOwnReservation ? (
        <>
          <button
            type="button"
            onClick={handleCancelReservation}
            disabled={loading}
            className="w-full rounded-md border border-destructive px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:outline-none disabled:opacity-60"
          >
            {loading ? "در حال لغو..." : "لغو رزرو"}
          </button>

          {currentReservationId && (
            <ReservationProofForm
              reservationId={currentReservationId}
              initialProof={proof}
              onSaved={(updated) => setProof(updated)}
            />
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={handleReserve}
          disabled={loading}
          className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
        >
          {loading ? "در حال رزرو..." : "رزرو کن"}
        </button>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">رزرو هدیه</h2>

            <label className="mb-2 block text-sm">
              پیام برای صاحب لیست (اختیاری)
            </label>

            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mb-5 w-full rounded-lg border border-input p-2"
              placeholder="مثلاً: امیدوارم دوستش داشته باشی 🌹"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDialog(false)}
                className="rounded-md border px-4 py-2"
              >
                انصراف
              </button>

              <button
                onClick={submitReservation}
                disabled={loading}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
              >
                ثبت رزرو
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}