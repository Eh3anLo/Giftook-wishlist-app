"use client"

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import ConfirmDialog from '@/components/common/ConfirmDialog'

/**
 * DeleteAccountButton — Client Component.
 *
 * Renders "حذف حساب" button. On click it opens a ConfirmDialog.
 * On confirmation it calls DELETE /api/users/me then signs the user out.
 */
export default function DeleteAccountButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/users/me', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'خطایی رخ داد. لطفاً دوباره تلاش کنید.')
        setLoading(false)
        return
      }
      // Session invalidated server-side; sign out client-side and redirect
      await signOut({ callbackUrl: '/' })
    } catch {
      setError('خطایی رخ داد. لطفاً دوباره تلاش کنید.')
      setLoading(false)
    }
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen(true)}
        className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
      >
        {loading ? 'در حال پردازش…' : 'حذف حساب'}
      </button>

      <ConfirmDialog
        open={open}
        title="حذف حساب کاربری"
        description="آیا مطمئن هستید که می‌خواهید حساب خود را حذف کنید؟ این عملیات غیرقابل بازگشت است و تمام آرزوهای ثبت‌شده شما برای همیشه پاک خواهند شد."
        confirmLabel="بله، حساب را حذف کن"
        cancelLabel="انصراف"
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
