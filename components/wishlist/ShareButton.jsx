"use client"

import { useState } from 'react'

/**
 * ShareButton — Client Component.
 * Copies the wishlist share URL to the clipboard using the Clipboard API.
 * Shows a Persian success message on copy.
 *
 * Props:
 *  - shareToken (string): the wishlist's share token
 */
export default function ShareButton({ shareToken }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)

  async function handleCopy() {
    const url = `${window.location.origin}/w/${shareToken}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setError(false)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback for browsers that don't support clipboard API
      setError(true)
      setTimeout(() => setError(false), 2500)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1" dir="rtl">
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label="کپی لینک اشتراک‌گذاری"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        {copied ? 'لینک کپی شد ✓' : 'کپی لینک اشتراک‌گذاری'}
      </button>

      {copied && (
        <p role="status" className="text-xs text-green-600">
          لینک با موفقیت کپی شد!
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          کپی لینک امکان‌پذیر نبود. لینک را دستی کپی کنید.
        </p>
      )}
    </div>
  )
}
