"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Select from '@radix-ui/react-select'
import * as Switch from '@radix-ui/react-switch'
import ErrorMessage from '@/components/common/ErrorMessage'

/**
 * WishlistForm — Client Component.
 * Controlled form for creating or editing a wishlist.
 * Uses Radix UI Select and Switch primitives.
 * All labels and placeholders are in Persian.
 *
 * Props:
 *  - initialData (object, optional): pre-populated wishlist data for editing
 *  - wishlistId (string, optional): if provided, PATCHes instead of POSTing
 *  - onSuccess (fn, optional): called with the created/updated wishlist id
 */
export default function WishlistForm({ initialData = {}, wishlistId, onSuccess }) {
  const router = useRouter()

  const [title, setTitle] = useState(initialData.title ?? '')
  const [description, setDescription] = useState(initialData.description ?? '')
  const [occasion, setOccasion] = useState(initialData.occasion ?? '')
  const [visibility, setVisibility] = useState(initialData.visibility ?? 'private')
  const [coverImage, setCoverImage] = useState(initialData.coverImage ?? '')
  const [showReserverIdentity, setShowReserverIdentity] = useState(
    initialData.showReserverIdentity ?? false
  )

  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const isEditMode = Boolean(wishlistId)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    // Client-side title validation
    if (!title.trim()) {
      setFieldErrors({ title: 'عنوان لیست آرزوها الزامی است.' })
      return
    }
    if (title.length > 100) {
      setFieldErrors({ title: 'عنوان نباید بیش از ۱۰۰ کاراکتر باشد.' })
      return
    }

    const body = {
      title: title.trim(),
      description: description || undefined,
      occasion: occasion || undefined,
      visibility,
      coverImage: coverImage || undefined,
      showReserverIdentity,
    }

    setLoading(true)
    try {
      const url = isEditMode ? `/api/wishlists/${wishlistId}` : '/api/wishlists'
      const method = isEditMode ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.field) {
          setFieldErrors({ [data.field]: data.error })
        } else {
          setError(data.error ?? 'خطایی رخ داده است.')
        }
        return
      }

      if (onSuccess) {
        onSuccess(data)
      } else {
        // Default redirect: go to the wishlist detail page
        const id = isEditMode ? wishlistId : data.id
        router.push(`/wishlists/${id}`)
      }
    } catch {
      setError('خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      dir="rtl"
      className="space-y-5"
      noValidate
    >
      {/* General error */}
      {error && <ErrorMessage message={error} />}

      {/* Title */}
      <div className="flex flex-col gap-1">
        <label htmlFor="wf-title" className="text-sm font-medium text-foreground">
          عنوان <span className="text-destructive">*</span>
        </label>
        <input
          id="wf-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثلاً: آرزوهای تولدم"
          maxLength={100}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          aria-invalid={!!fieldErrors.title}
          aria-describedby={fieldErrors.title ? 'wf-title-error' : undefined}
        />
        {fieldErrors.title && (
          <ErrorMessage message={fieldErrors.title} />
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label htmlFor="wf-description" className="text-sm font-medium text-foreground">
          توضیحات
        </label>
        <textarea
          id="wf-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="توضیح کوتاهی درباره این لیست (اختیاری)"
          maxLength={500}
          rows={3}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          aria-invalid={!!fieldErrors.description}
        />
        {fieldErrors.description && <ErrorMessage message={fieldErrors.description} />}
      </div>

      {/* Occasion */}
      <div className="flex flex-col gap-1">
        <label htmlFor="wf-occasion" className="text-sm font-medium text-foreground">
          مناسبت
        </label>
        <Select.Root value={occasion} onValueChange={setOccasion}>
          <Select.Trigger
            id="wf-occasion"
            className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 data-[placeholder]:text-muted-foreground"
            aria-label="انتخاب مناسبت"
          >
            <Select.Value placeholder="انتخاب مناسبت (اختیاری)" />
            <Select.Icon className="text-muted-foreground">▾</Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              dir="rtl"
              className="z-50 overflow-hidden rounded-md border border-border bg-popover shadow-md"
              position="popper"
              sideOffset={4}
            >
              <Select.Viewport className="p-1">
                <Select.Item
                  value="تولد"
                  className="cursor-pointer select-none rounded px-3 py-2 text-sm text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                >
                  <Select.ItemText>بدون مناسبت</Select.ItemText>
                </Select.Item>
                {[
                  { value: 'birthday', label: 'تولد' },
                  { value: 'wedding', label: 'عروسی' },
                  { value: 'holiday', label: 'تعطیلات' },
                  { value: 'other', label: 'سایر' },
                ].map((opt) => (
                  <Select.Item
                    key={opt.value}
                    value={opt.value}
                    className="cursor-pointer select-none rounded px-3 py-2 text-sm text-foreground outline-none hover:bg-accent hover:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                  >
                    <Select.ItemText>{opt.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        {fieldErrors.occasion && <ErrorMessage message={fieldErrors.occasion} />}
      </div>

      {/* Visibility */}
      <div className="flex flex-col gap-1">
        <label htmlFor="wf-visibility" className="text-sm font-medium text-foreground">
          نمایش‌پذیری <span className="text-destructive">*</span>
        </label>
        <Select.Root value={visibility} onValueChange={setVisibility}>
          <Select.Trigger
            id="wf-visibility"
            className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
            aria-label="انتخاب نمایش‌پذیری"
          >
            <Select.Value />
            <Select.Icon className="text-muted-foreground">▾</Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              dir="rtl"
              className="z-50 overflow-hidden rounded-md border border-border bg-popover shadow-md"
              position="popper"
              sideOffset={4}
            >
              <Select.Viewport className="p-1">
                {[
                  { value: 'public', label: 'عمومی' },
                  { value: 'private', label: 'خصوصی' },
                  { value: 'link_only', label: 'فقط با لینک' },
                ].map((opt) => (
                  <Select.Item
                    key={opt.value}
                    value={opt.value}
                    className="cursor-pointer select-none rounded px-3 py-2 text-sm text-foreground outline-none hover:bg-accent hover:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                  >
                    <Select.ItemText>{opt.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        {fieldErrors.visibility && <ErrorMessage message={fieldErrors.visibility} />}
      </div>

      {/* Cover image URL */}
      <div className="flex flex-col gap-1">
        <label htmlFor="wf-cover" className="text-sm font-medium text-foreground">
          آدرس تصویر کاور
        </label>
        <input
          id="wf-cover"
          type="url"
          value={coverImage}
          onChange={(e) => setCoverImage(e.target.value)}
          placeholder="https://example.com/image.jpg (اختیاری)"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          aria-invalid={!!fieldErrors.coverImage}
          dir="ltr"
        />
        {fieldErrors.coverImage && <ErrorMessage message={fieldErrors.coverImage} />}
      </div>

      {/* showReserverIdentity toggle */}
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-4 py-3">
        <label
          htmlFor="wf-show-reserver"
          className="cursor-pointer text-sm font-medium text-foreground"
        >
          نمایش هویت رزرو‌کننده به من
        </label>
        <Switch.Root
          id="wf-show-reserver"
          checked={showReserverIdentity}
          onCheckedChange={setShowReserverIdentity}
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
          aria-label="نمایش هویت رزرو‌کننده"
        >
          <Switch.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 rtl:data-[state=checked]:-translate-x-5 rtl:data-[state=unchecked]:translate-x-0" />
        </Switch.Root>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60"
      >
        {loading ? 'در حال ذخیره...' : isEditMode ? 'ذخیره تغییرات' : 'ایجاد لیست'}
      </button>
    </form>
  )
}
