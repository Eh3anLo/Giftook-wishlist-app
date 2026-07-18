function formatDate(date) {
  if (!date) return null
  try {
    return new Date(date).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return null
  }
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/**
 * Read-only summary cards for the dashboard: total wishlists, total items,
 * reservation progress, most common priority, and the latest reservation
 * date across all of the user's wishlists.
 *
 * @param {{ stats: Awaited<ReturnType<typeof import('@/services/stats.service.js').getUserStats>> }} props
 */
export default function StatsOverview({ stats }) {
  const { wishlistCount, totalItems, reservedItems, progressPercent, topPriority, latestReservationAt } =
    stats

  const latestDate = formatDate(latestReservationAt)

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="لیست‌های آرزو" value={wishlistCount} />
      <StatCard label="آیتم‌های هدیه" value={totalItems} />
      <StatCard
        label="رزروشده"
        value={`${reservedItems} از ${totalItems}`}
        hint={totalItems > 0 ? `${progressPercent}٪ پیشرفت` : null}
      />
      <StatCard
        label="اولویت پرتکرار"
        value={topPriority ? topPriority.label : '—'}
        hint={latestDate ? `آخرین رزرو: ${latestDate}` : null}
      />
    </div>
  )
}