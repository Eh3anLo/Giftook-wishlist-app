'use client'

import { useEffect, useState } from 'react'

const OCCASIONS = [
  { value: '', label: 'مهم نیست' },
  { value: 'birthday', label: 'تولد' },
  { value: 'wedding', label: 'عروسی' },
  { value: 'holiday', label: 'مناسبت خاص' },
  { value: 'other', label: 'سایر' },
]

const QUICK_FOLLOW_UPS = [
  { label: 'ارزون‌تر', text: 'گزینه‌های ارزون‌تری پیشنهاد بده.' },
  { label: 'گزینه‌های متفاوت', text: 'گزینه‌های کاملاً متفاوتی پیشنهاد بده، این‌ها رو تکرار نکن.' },
  { label: 'خاص‌تر و باکیفیت‌تر', text: 'گزینه‌های خاص‌تر و باکیفیت‌تری پیشنهاد بده، حتی اگر گرون‌تره.' },
]

function formatResetTime(resetAt) {
  if (!resetAt) return null
  try {
    return new Date(resetAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return null
  }
}

export default function GenieDialog({ wishlistId, onItemAdded }) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [occasion, setOccasion] = useState('')
  const [loading, setLoading] = useState(false)
  const [refining, setRefining] = useState(false)
  const [error, setError] = useState(null)
  const [errorResetAt, setErrorResetAt] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [conversationMessages, setConversationMessages] = useState(null)
  const [followUpText, setFollowUpText] = useState('')
  const [addingIndex, setAddingIndex] = useState(null)
  const [addedIndexes, setAddedIndexes] = useState(new Set())
  const [usage, setUsage] = useState(null)

  // Fetch today's remaining quota as soon as the dialog opens, before the
  // user has generated anything yet.
  useEffect(() => {
    if (!open) return

    let cancelled = false
    fetch('/api/genie/usage')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setUsage(data)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [open])

  function reset() {
    setDescription('')
    setBudget('')
    setOccasion('')
    setError(null)
    setErrorResetAt(null)
    setSuggestions([])
    setConversationMessages(null)
    setFollowUpText('')
    setAddedIndexes(new Set())
  }

  function handleErrorResponse(data) {
    setError(data.error || 'خطایی رخ داد. دوباره امتحان کن.')
    setErrorResetAt(data.resetAt ?? null)
    if (data.resetAt !== undefined) {
      // A 429 response also tells us the quota is exhausted right now.
      setUsage((prev) => (prev ? { ...prev, remaining: 0 } : prev))
    }
  }

  async function handleGenerate(e) {
    e.preventDefault()
    setError(null)
    setErrorResetAt(null)
    setLoading(true)
    setSuggestions([])
    setConversationMessages(null)
    setAddedIndexes(new Set())

    try {
      const res = await fetch(`/api/wishlists/${wishlistId}/genie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          budget: budget ? Number(budget) : undefined,
          occasion: occasion || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        handleErrorResponse(data)
        return
      }

      setSuggestions(data.suggestions ?? [])
      setConversationMessages(data.conversationMessages ?? null)
      if (data.usage) setUsage(data.usage)
    } catch {
      setError('ارتباط با سرور برقرار نشد.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRefine(text) {
    const followUp = text.trim()
    if (!followUp || !conversationMessages) return

    setError(null)
    setErrorResetAt(null)
    setRefining(true)

    try {
      const res = await fetch(`/api/wishlists/${wishlistId}/genie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followUp, conversationMessages }),
      })

      const data = await res.json()

      if (!res.ok) {
        handleErrorResponse(data)
        return
      }

      setSuggestions(data.suggestions ?? [])
      setConversationMessages(data.conversationMessages ?? null)
      if (data.usage) setUsage(data.usage)
      setAddedIndexes(new Set())
      setFollowUpText('')
    } catch {
      setError('ارتباط با سرور برقرار نشد.')
    } finally {
      setRefining(false)
    }
  }

  async function handleAdd(suggestion, index) {
    setAddingIndex(index)
    try {
      const res = await fetch(`/api/wishlists/${wishlistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: suggestion.title,
          description: suggestion.description,
          price: suggestion.estimatedMinPrice ?? undefined,
          url: suggestion.searchUrl,
          source: 'genie',
        }),
      })

      const item = await res.json()

      if (!res.ok) {
        setError(item.error || 'افزودن آیتم با خطا مواجه شد.')
        return
      }

      setAddedIndexes((prev) => new Set(prev).add(index))
      onItemAdded?.(item)
    } catch {
      setError('ارتباط با سرور برقرار نشد.')
    } finally {
      setAddingIndex(null)
    }
  }

  const quotaExhausted = usage && usage.remaining <= 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path
            d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"
            strokeLinecap="round"
          />
        </svg>
        از Genie بپرس
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-background shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Genie — دستیار پیشنهاد هدیه</h2>
                {usage && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {usage.remaining} از {usage.limit} درخواست امروز باقی مانده
                    {quotaExhausted && errorResetAt === null && usage.resetAt
                      ? ` — از ${formatResetTime(usage.resetAt)} دوباره در دسترسه`
                      : ''}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  reset()
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="بستن"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {!conversationMessages && (
                <form onSubmit={handleGenerate} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm text-foreground">گیرنده هدیه رو توصیف کن</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="مثلاً: خواهرم، ۲۵ ساله، عاشق کتاب و قهوه، به سبک مینیمال علاقه داره"
                      rows={3}
                      maxLength={500}
                      required
                      disabled={quotaExhausted}
                      className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm text-foreground">بودجه (تومان)</label>
                      <input
                        type="number"
                        min="1000"
                        step="1000"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        placeholder="مثلاً ۱۵۰۰۰۰۰"
                        disabled={quotaExhausted}
                        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-foreground">مناسبت</label>
                      <select
                        value={occasion}
                        onChange={(e) => setOccasion(e.target.value)}
                        disabled={quotaExhausted}
                        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                      >
                        {OCCASIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || quotaExhausted}
                    className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? 'در حال فکر کردن...' : quotaExhausted ? 'سهمیه امروز تمام شده' : 'پیشنهاد بگیر'}
                  </button>
                </form>
              )}

              {error && (
                <p className="mt-3 text-sm text-destructive">
                  {error}
                  {errorResetAt && ` (دوباره از ${formatResetTime(errorResetAt)} در دسترس است)`}
                </p>
              )}

              {suggestions.length > 0 && (
                <>
                  <ul className="mt-5 space-y-3">
                    {suggestions.map((s, index) => (
                      <li key={`${s.title}-${index}`} className="rounded-md border border-border bg-card p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{s.title}</p>
                            {s.description && (
                              <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {s.category && (
                                <span className="rounded-full border border-border px-2 py-0.5">{s.category}</span>
                              )}
                              {(s.estimatedMinPrice || s.estimatedMaxPrice) && (
                                <span>
                                  {s.estimatedMinPrice != null ? s.estimatedMinPrice.toLocaleString('fa-IR') : '؟'}
                                  {' تا '}
                                  {s.estimatedMaxPrice != null ? s.estimatedMaxPrice.toLocaleString('fa-IR') : '؟'}
                                  {' تومان'}
                                </span>
                              )}
                              <a href={s.searchUrl} target="_blank" rel="noreferrer" className="underline">
                            جستجو در گوگل
                              </a>
                              <a href={s.searchUrl2} target="_blank" rel="noreferrer" className="underline">
                                جستجو در دیجی کالا
                              </a>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAdd(s, index)}
                            disabled={addingIndex === index || addedIndexes.has(index)}
                            className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                          >
                            {addedIndexes.has(index) ? 'اضافه شد ✓' : addingIndex === index ? '...' : 'افزودن'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {conversationMessages && (
                    <div className="mt-4 space-y-2 border-t border-border pt-4">
                      <p className="text-xs text-muted-foreground">می‌خوای پیشنهادها رو بهتر کنم؟</p>

                      <div className="flex flex-wrap gap-2">
                        {QUICK_FOLLOW_UPS.map((q) => (
                          <button
                            key={q.label}
                            type="button"
                            disabled={refining || quotaExhausted}
                            onClick={() => handleRefine(q.text)}
                            className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-muted disabled:opacity-50"
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleRefine(followUpText)
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          value={followUpText}
                          onChange={(e) => setFollowUpText(e.target.value)}
                          placeholder="مثلاً: چیز کاربردی‌تر برای خونه پیشنهاد بده"
                          maxLength={200}
                          disabled={quotaExhausted}
                          className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                        />
                        <button
                          type="submit"
                          disabled={refining || quotaExhausted || !followUpText.trim()}
                          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                        >
                          {refining ? '...' : 'ارسال'}
                        </button>
                      </form>

                      <button
                        type="button"
                        onClick={reset}
                        className="text-xs text-muted-foreground underline hover:text-foreground"
                      >
                        شروع یک مکالمه جدید
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}