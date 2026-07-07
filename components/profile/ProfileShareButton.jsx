"use client"

import { useState } from "react"

/**
 * ProfileShareButton
 *
 * Props:
 *  - userId (string)
 *  - userName (string)
 */
export default function ProfileShareButton({ userId, userName }) {
  function fallbackCopy(text) {
    const textarea = document.createElement("textarea")
    textarea.value = text

    textarea.style.position = "fixed"
    textarea.style.left = "-9999px"

    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()

    try {
      document.execCommand("copy")
      return true
    } catch {
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)

  async function handleShare() {
    const url = `${window.location.origin}/u/${userId}`

    try {
      // موبایل و مرورگرهای جدید
      if (navigator.share) {
        await navigator.share({
          title: `${userName} در گیفتوک`,
          text: "پروفایل من را ببینید.",
          url,
        })
        return
      }

      // دسکتاپ و مرورگرهایی که Share ندارند
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const ok = fallbackCopy(url)

        if (!ok) {
          throw new Error("Copy failed")
        }
      }

      setCopied(true)
      setError(false)

      setTimeout(() => setCopied(false), 2500)
    } catch (error) {
      //   console.error(error)
      setError(true)
      setTimeout(() => setError(false), 2500)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1" dir="rtl">
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.684 13.342a3 3 0 010-2.684l6.632-3.316a3 3 0 110 5.368l-6.632-3.368zm0 0L15.316 16.7a3 3 0 11-1.342 2.684L7.342 16.7a3 3 0 111.342-3.358z"
          />
        </svg>
        اشتراک‌گذاری پروفایل
      </button>

      {copied && <p className="text-xs text-green-600">لینک پروفایل کپی شد.</p>}
      <p>{error}</p>
      {error && (
        <p className="text-xs text-red-600">{error}اشتراک‌گذاری انجام نشد.</p>
      )}
    </div>
  )
}
