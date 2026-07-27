"use client"

import { useState } from "react"

export default function OwnerReservationDialog({
  open,
  onClose,
  giftItemId,
  reservation,
  showReserverIdentity,
  onSuccess,
}) {
  const [type, setType] = useState("self") // self | other
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          giftItemId,
          ownerReservation: true,
          reserveForSelf: type === "self",

          guestName: type === "other" ? name : undefined,
          guestEmail: null,
          guestPhone: null,

          message,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "خطا در ثبت رزرو.")
        return
      }

      onSuccess?.()
      onClose()
    } catch {
      setError("خطا در ارتباط با سرور.")
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelReservation() {
    if (!reservation?.id) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "خطا در لغو رزرو.")
        return
      }
      setName("")
      setEmail("")
      setPhone("")
      setMessage("")
      setType("self")
      onSuccess?.()
      onClose()
    } catch {
      setError("خطا در ارتباط با سرور.")
    } finally {
      setLoading(false)
    }
  }

  const hasProof = Boolean(
    reservation?.receiptImageUrl || reservation?.shippingAddress || reservation?.trackingCode
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
        <h2 className="mb-5 text-xl font-bold">مدیریت رزرو</h2>

        {reservation ? (
          <>
            <div className="mb-6 rounded-lg bg-muted p-4">
              <p className="font-medium">این هدیه رزرو شده است.</p>

              {showReserverIdentity && (
                <p className="mt-2 text-sm text-muted-foreground">
                  رزروکننده:{" "}
                  {reservation.user?.name ?? reservation.guestName ?? "کاربر"}
                </p>
              )}

              {reservation.message && (
                <div className="mt-3 rounded-md border bg-background p-3 text-sm">
                  {reservation.message}
                </div>
              )}

              {/* Purchase proof — read-only for the owner */}
              {hasProof && (
                <div className="mt-3 space-y-2 rounded-md border bg-background p-3 text-sm">
                  <p className="text-xs font-medium text-muted-foreground">اطلاعات خرید</p>
                  {reservation.receiptImageUrl && (<a
                      href={reservation.receiptImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-primary underline"
                    >
                      مشاهده تصویر رسید
                    </a>
                  )}
                  {reservation.shippingAddress && (
                    <p className="text-xs text-muted-foreground">
                      آدرس ارسال: <span className="text-foreground">{reservation.shippingAddress}</span>
                    </p>
                  )}
                  {reservation.trackingCode && (
                    <p className="text-xs text-muted-foreground">
                      کد رهگیری: <span className="text-foreground" dir="ltr">{reservation.trackingCode}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-md border px-4 py-2">
                بستن
              </button>

              <button
                disabled={loading}
                onClick={handleCancelReservation}
                className="text-destructive-foreground rounded-md bg-destructive px-4 py-2"
              >
                {loading ? "..." : "لغو رزرو"}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={type === "self"}
                  onChange={() => setType("self")}
                />
                خودم رزرو کرده‌ام
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={type === "other"}
                  onChange={() => setType("other")}
                />
                شخص دیگری رزرو کرده است
              </label>
            </div>

            {type === "other" && (
              <div className="mt-5">
                <label className="mb-1 block text-sm">نام شخص</label>

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-input p-2"
                />
              </div>
            )}

            <div className="mt-5">
              <label className="mb-1 block text-sm">پیام (اختیاری)</label>

              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-lg border border-input p-2"
              />
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border px-4 py-2"
              >
                انصراف
              </button>

              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
              >
                {loading ? "در حال ثبت..." : "ثبت رزرو"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}