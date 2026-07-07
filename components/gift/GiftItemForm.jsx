"use client"

import { useState } from 'react'
import * as Select from '@radix-ui/react-select'
import ErrorMessage from '@/components/common/ErrorMessage'

/**
 * GiftItemForm — Client Component.
 * Controlled form for creating or editing a gift item.
 * All labels and placeholders are in Persian.
 *
 * Props:
 *  - wishlistId (string): the parent wishlist id
 *  - item (object, optional): existing item data for edit mode
 *  - onSuccess (fn): called after a successful create/update
 *  - onCancel (fn): called when the user cancels
 */
export default function GiftItemForm({ wishlistId, item, onSuccess, onCancel }) {
  const isEditMode = Boolean(item?.id)

  const [title, setTitle] = useState(item?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [price, setPrice] = useState(
    item?.price != null ? String(Number(item.price)) : ''
  )
  const [url, setUrl] = useState(item?.url ?? '')
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? '')
  const [priority, setPriority] = useState(item?.priority ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')

  const [fieldErrors, setFieldErrors] = useState({})
  const [generalError, setGeneralError] = useState('')
  const [loading, setLoading] = useState(false)

  // Client-side validation — returns a fieldErrors object (empty = valid)
  function validate() {
    const errors = {}

    if (!title.trim()) {
      errors.title = 'عنوان هدیه الزامی است.'
    } else if (title.trim().length > 150) {
      errors.title = 'عنوان نباید بیش از ۱۵۰ کاراکتر باشد.'
    }

    if (description && description.length > 1000) {
      errors.description = 'توضیحات نباید بیش از ۱۰۰۰ کاراکتر باشد.'
    }

    if (price !== '') {
      const priceNum = Number(price)
      if (isNaN(priceNum) || !isFinite(priceNum)) {
        errors.price = 'قیمت باید یک عدد معتبر باشد.'
      } else if (priceNum < 0.01) {
        errors.price = 'قیمت باید حداقل ۰.۰۱ باشد.'
      } else if (priceNum > 999999999.99) {
        errors.price = 'قیمت از حد مجاز تجاوز می‌کند.'
      } else if (!/^\d+(\.\d{1,2})?$/.test(price.trim())) {
        errors.price = 'قیمت می‌تواند حداکثر ۲ رقم اعشار داشته باشد.'
      }
    }

    if (url && !/^https?:\/\//i.test(url)) {
      errors.url = 'آدرس لینک باید با http:// یا https:// شروع شود.'
    }

    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      errors.imageUrl = 'آدرس تصویر باید با http:// یا https:// شروع شود.'
    }

    if (notes && notes.length > 500) {
      errors.notes = 'یادداشت نباید بیش از ۵۰۰ کاراکتر باشد.'
    }

    return errors
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setGeneralError('')

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})

    const body = {
      title: title.trim(),
    }
    if (description !== '') body.description = description
    if (price !== '') body.price = Number(price)
    if (url !== '') body.url = url
    if (imageUrl !== '') body.imageUrl = imageUrl
    if (priority !== '') body.priority = priority
    if (notes !== '') body.notes = notes

    setLoading(true)
    try {
      const endpoint = isEditMode
        ? `/api/wishlists/${wishlistId}/items/${item.id}`
        : `/api/wishlists/${wishlistId}/items`
      const method = isEditMode ? 'PATCH' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.field) {
          setFieldErrors({ [data.field]: data.error })
        } else {
          setGeneralError(data.error ?? 'خطایی رخ داده است.')
        }
        return
      }

      onSuccess?.()
    } catch {
      setGeneralError('خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      dir="rtl"
      className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
      noValidate
    >
      <h3 className="text-base font-semibold text-foreground">
        {isEditMode ? 'ویرایش هدیه' : 'افزودن هدیه جدید'}
      </h3>

      {/* General error */}
      {generalError && <ErrorMessage message={generalError} />}

      {/* Title */}
      <div className="flex flex-col gap-1">
        <label htmlFor="gif-title" className="text-sm font-medium text-foreground">
          عنوان <span className="text-destructive">*</span>
        </label>
        <input
          id="gif-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثلاً: هدفون بی‌سیم"
          maxLength={150}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          aria-invalid={!!fieldErrors.title}
          aria-describedby={fieldErrors.title ? 'gif-title-error' : undefined}
        />
        {fieldErrors.title && (
          <ErrorMessage message={fieldErrors.title} />
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label htmlFor="gif-description" className="text-sm font-medium text-foreground">
          توضیحات
        </label>
        <textarea
          id="gif-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="توضیح مختصری درباره این هدیه (اختیاری)"
          maxLength={1000}
          rows={3}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          aria-invalid={!!fieldErrors.description}
        />
        {fieldErrors.description && <ErrorMessage message={fieldErrors.description} />}
      </div>

      {/* Price */}
      <div className="flex flex-col gap-1">
        <label htmlFor="gif-price" className="text-sm font-medium text-foreground">
          قیمت (تومان)
        </label>
        <input
          id="gif-price"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="مثلاً: 1500000 (اختیاری)"
          min="0.01"
          max="999999999.99"
          step="0.01"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          aria-invalid={!!fieldErrors.price}
          dir="ltr"
        />
        {fieldErrors.price && <ErrorMessage message={fieldErrors.price} />}
      </div>

      {/* URL */}
      <div className="flex flex-col gap-1">
        <label htmlFor="gif-url" className="text-sm font-medium text-foreground">
          لینک محصول
        </label>
        <input
          id="gif-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/product (اختیاری)"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          aria-invalid={!!fieldErrors.url}
          dir="ltr"
        />
        {fieldErrors.url && <ErrorMessage message={fieldErrors.url} />}
      </div>

      {/* Image URL */}
      <div className="flex flex-col gap-1">
        <label htmlFor="gif-image" className="text-sm font-medium text-foreground">
          آدرس تصویر
        </label>
        <input
          id="gif-image"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/image.jpg (اختیاری)"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          aria-invalid={!!fieldErrors.imageUrl}
          dir="ltr"
        />
        {fieldErrors.imageUrl && <ErrorMessage message={fieldErrors.imageUrl} />}
      </div>

      {/* Priority */}
      <div className="flex flex-col gap-1">
        <label htmlFor="gif-priority" className="text-sm font-medium text-foreground">
          اولویت
        </label>
        <Select.Root value={priority} onValueChange={setPriority}>
          <Select.Trigger
            id="gif-priority"
            className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 data-[placeholder]:text-muted-foreground"
            aria-label="انتخاب اولویت"
          >
            <Select.Value placeholder="انتخاب اولویت (اختیاری)" />
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
                  value="medium"
                  className="cursor-pointer select-none rounded px-3 py-2 text-sm text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                >
                  <Select.ItemText>بدون اولویت</Select.ItemText>
                </Select.Item>
                {[
                  { value: 'low', label: 'کم' },
                  { value: 'medium', label: 'متوسط' },
                  { value: 'high', label: 'زیاد' },
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
        {fieldErrors.priority && <ErrorMessage message={fieldErrors.priority} />}
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1">
        <label htmlFor="gif-notes" className="text-sm font-medium text-foreground">
          یادداشت
        </label>
        <textarea
          id="gif-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="یادداشت اضافه‌ای برای این هدیه (اختیاری)"
          maxLength={500}
          rows={2}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          aria-invalid={!!fieldErrors.notes}
        />
        {fieldErrors.notes && <ErrorMessage message={fieldErrors.notes} />}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60"
        >
          {loading ? 'در حال ذخیره...' : 'ذخیره'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-input bg-background px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          انصراف
        </button>
      </div>
    </form>
  )
}
