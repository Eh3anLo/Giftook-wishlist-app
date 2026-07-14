"use client"

import { useState } from "react"

const OCCASIONS = [
  { value: "", label: "مهم نیست" },
  { value: "birthday", label: "تولد" },
  { value: "wedding", label: "عروسی" },
  { value: "holiday", label: "مناسبت خاص" },
  { value: "other", label: "سایر" },
]

export default function GenieDialog({ wishlistId, onItemAdded }) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [budget, setBudget] = useState("")
  const [occasion, setOccasion] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [addingIndex, setAddingIndex] = useState(null)
  const [addedIndexes, setAddedIndexes] = useState(new Set())

  function reset() {
    setDescription("")
    setBudget("")
    setOccasion("")
    setError(null)
    setSuggestions([])
    setAddedIndexes(new Set())
  }

  async function handleGenerate(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setSuggestions([])

    try {
      const res = await fetch(`/api/wishlists/${wishlistId}/genie`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          budget: budget ? Number(budget) : undefined,
          occasion: occasion || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "خطایی رخ داد. دوباره امتحان کن.")
        return
      }

      setSuggestions(data.suggestions ?? [])
    } catch {
      setError("ارتباط با سرور برقرار نشد.")
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(suggestion, index) {
    setAddingIndex(index)
    try {
      const res = await fetch(`/api/wishlists/${wishlistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: suggestion.title,
          description: suggestion.description,
          price: suggestion.estimatedMinPrice ?? undefined,
          url: suggestion.searchUrl,
          source: "genie",
        }),
      })

      const item = await res.json()

      if (!res.ok) {
        setError(item.error || "افزودن آیتم با خطا مواجه شد.")
        return
      }

      setAddedIndexes((prev) => new Set(prev).add(index))
      onItemAdded?.(item)
    } catch {
      setError("ارتباط با سرور برقرار نشد.")
    } finally {
      setAddingIndex(null)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
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
              <h2 className="text-lg font-semibold text-foreground">
                Genie — دستیار پیشنهاد هدیه
              </h2>
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
              <form onSubmit={handleGenerate} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-foreground">
                    گیرنده هدیه رو توصیف کن
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="مثلاً: خواهرم، ۲۵ ساله، عاشق کتاب و قهوه، به سبک مینیمال علاقه داره"
                    rows={3}
                    maxLength={500}
                    required
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm text-foreground">
                      بودجه (دلار)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="اختیاری"
                      className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-foreground">
                      مناسبت
                    </label>
                    <select
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value)}
                      className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {OCCASIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "در حال فکر کردن..." : "پیشنهاد بگیر"}
                </button>
              </form>

              {suggestions.length > 0 && (
                <ul className="mt-5 space-y-3">
                  {suggestions.map((s, index) => (
                    <li
                      key={`${s.title}-${index}`}
                      className="rounded-md border border-border bg-card p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {s.title}
                          </p>
                          {s.description && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {s.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {s.category && (
                              <span className="rounded-full border border-border px-2 py-0.5">
                                {s.category}
                              </span>
                            )}
                            {(s.estimatedMinPrice || s.estimatedMaxPrice) && (
                              <span>
                                ${s.estimatedMinPrice ?? "?"} - $
                                {s.estimatedMaxPrice ?? "?"}
                              </span>
                            )}
                            <a
                              href={s.searchUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              جستجو
                            </a>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAdd(s, index)}
                          disabled={
                            addingIndex === index || addedIndexes.has(index)
                          }
                          className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                        >
                          {addedIndexes.has(index)
                            ? "اضافه شد ✓"
                            : addingIndex === index
                              ? "..."
                              : "افزودن"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
