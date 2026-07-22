'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * FollowButton — Client Component.
 * Toggles following/unfollowing the given profile. Shows a "دوست" badge
 * when the relationship is mutual.
 *
 * @param {{
 *   targetUserId: string,
 *   initialIsFollowing: boolean,
 *   initialIsFriend: boolean,
 * }} props
 */
export default function FollowButton({ targetUserId, initialIsFollowing, initialIsFriend }) {
  const router = useRouter()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isFriend, setIsFriend] = useState(initialIsFriend)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleToggle() {
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/api/users/${targetUserId}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'خطایی رخ داد.')
        return
      }

      setIsFollowing(!isFollowing)
      if (isFollowing) setIsFriend(false) // unfollowing can never leave a mutual friendship intact
      router.refresh()
    } catch {
      setError('خطا در ارتباط با سرور.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
            isFollowing
              ? 'border border-border bg-background text-foreground hover:bg-muted'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {loading ? '...' : isFollowing ? 'دنبال می‌کنید' : 'دنبال کردن'}
        </button>

        {isFriend && (
          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
            دوست
          </span>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}