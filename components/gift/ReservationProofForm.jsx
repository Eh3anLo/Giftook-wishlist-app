"use client"

import { useState } from "react"

/**
 * ReservationProofForm — Client Component.
 * Lets the person who made a reservation attach purchase proof after
 * buying the gift: a receipt image URL, a shipping address, and/or a
 * tracking code. All fields are optional and saved independently.
 *
 * Props:
 *  - reservationId (string): the reservation to update
 *  - initialProof (object|null): { receiptImageUrl, shippingAddress, trackingCode }
 *  - onSaved (function): called with the updated proof object after a successful save
 */
export default function ReservationProofForm({ reservationId, initialProof, onSaved }) {
  const [open, setOpen] = useState(false)
  const [receiptImageUrl, setReceiptImageUrl] = useState(initialProof?.receiptImageUrl ?? "")
  const [shippingAddress, setShippingAddress] = useState(initialProof?.shippingAddress ?? "")
  const [trackingCode, setTrackingCode] = useState(initialProof?.trackingCode ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  const hasAnyProof = Boolean(
    initialProof?.receiptImageUrl || initialProof?.shippingAddress || initialProof?.trackingCode
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setSaved(false)
    setLoading(true)

    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptImageUrl: receiptImageUrl.trim() || null,
          shippingAddress: shippingAddress.trim() || null,
          trackingCode: trackingCode.trim() || null,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error ?? "خطا در ذخیره اطلاعات.")
        return
      }

      setSaved(true)
      onSaved?.(data)
    } catch {
      setError("خطا در ارتباط با سرور.")
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
      >
        {hasAnyProof ? "ویرایش اطلاعات خرید" : "ثبت اطلاعات خرید"}
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-2 rounded-md border border-border bg-muted/30 p-3 text-right"
    >
      <div>
        <label className="mb-1 block text-xs text-foreground">لینک تصویر رسید (اختیاری)</label>
        <input
          type="url"
          dir="ltr"
          value={receiptImageUrl}
          onChange={(e) => setReceiptImageUrl(e.target.value)}
          placeholder="https://example.com/receipt.jpg"
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-foreground">آدرس ارسال (اختیاری)</label>
        <textarea
          value={shippingAddress}
          onChange={(e) => setShippingAddress(e.target.value)}
          rows={2}
          maxLength={500}
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-foreground">کد رهگیری پستی (اختیاری)</label>
        <input
          type="text"
          value={trackingCode}
          onChange={(e) => setTrackingCode(e.target.value)}
          maxLength={100}
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {saved && !error && <p className="text-xs text-green-700">ذخیره شد ✓</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
        >
          {loading ? "..." : "ذخیره"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-md border border-input px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
        >
          بستن
        </button>
      </div>
    </form>
  )
}