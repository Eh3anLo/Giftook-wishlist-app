'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ErrorMessage from '@/components/common/ErrorMessage'

/**
 * ProfileForm
 *
 * Props:
 * - initialData
 *    {
 *      name,
 *      image,
 *      email
 *    }
 */
export default function ProfileForm({ initialData = {} }) {
  const router = useRouter()

  const [name, setName] = useState(initialData.name ?? '')
  const [image, setImage] = useState(initialData.image ?? '')
  const [email] = useState(initialData.email ?? '')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  async function handleSubmit(e) {
    e.preventDefault()

    setError('')
    setFieldErrors({})

    if (!name.trim()) {
      setFieldErrors({
        name: 'نام نمی‌تواند خالی باشد.',
      })
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          image: image.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.field) {
          setFieldErrors({
            [data.field]: data.error,
          })
        } else {
          setError(data.error ?? 'خطایی رخ داده است.')
        }
        return
      }

      router.replace('/profile')
      router.refresh()
    } catch {
      setError('خطا در ارتباط با سرور.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      dir="rtl"
      onSubmit={handleSubmit}
      className="space-y-5"
      noValidate
    >
      {error && <ErrorMessage message={error} />}

      {/* Name */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="profile-name"
          className="text-sm font-medium text-foreground"
        >
          نام نمایشی
        </label>

        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="نام شما"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          aria-invalid={!!fieldErrors.name}
        />

        {fieldErrors.name && (
          <ErrorMessage message={fieldErrors.name} />
        )}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="profile-email"
          className="text-sm font-medium text-foreground"
        >
          ایمیل
        </label>

        <input
          id="profile-email"
          type="email"
          value={email}
          disabled
          className="w-full cursor-not-allowed rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
        />

        <p className="text-xs text-muted-foreground">
          ایمیل قابل ویرایش نیست.
        </p>
      </div>

      {/* Avatar */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="profile-image"
          className="text-sm font-medium text-foreground"
        >
          تصویر پروفایل
        </label>

        <input
          id="profile-image"
          type="url"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="https://example.com/avatar.jpg"
          dir="ltr"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
        />

        {fieldErrors.image && (
          <ErrorMessage message={fieldErrors.image} />
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          انصراف
        </button>
      </div>
    </form>
  )
}