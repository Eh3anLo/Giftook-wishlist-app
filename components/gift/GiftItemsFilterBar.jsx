'use client'

import { PRIORITY_FILTERS, RESERVATION_FILTERS } from '@/lib/giftItemFilters.js'

function FilterPill({ active, onClick, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground hover:bg-muted'
      }`}
    >
      {label} ({count})
    </button>
  )
}

/**
 * GiftItemsFilterBar — Client Component.
 * Two independent pill groups: reservation status and priority.
 * Purely presentational — all filtering logic lives in lib/giftItemFilters.js.
 *
 * @param {{
 *   items: object[],
 *   priority: string,
 *   reservation: string,
 *   onPriorityChange: (value: string) => void,
 *   onReservationChange: (value: string) => void,
 * }} props
 */
export default function GiftItemsFilterBar({
  items,
  priority,
  reservation,
  onPriorityChange,
  onReservationChange,
}) {
  const reservationCounts = {
    all: items.length,
    reserved: items.filter((i) => i.isReserved).length,
    unreserved: items.filter((i) => !i.isReserved).length,
  }

  const priorityCounts = {
    all: items.length,
    high: items.filter((i) => i.priority === 'high').length,
    medium: items.filter((i) => i.priority === 'medium').length,
    low: items.filter((i) => i.priority === 'low').length,
  }

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1.5">
        {RESERVATION_FILTERS.map((f) => (
          <FilterPill
            key={f.value}
            label={f.label}
            count={reservationCounts[f.value]}
            active={reservation === f.value}
            onClick={() => onReservationChange(f.value)}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRIORITY_FILTERS.map((f) => (
          <FilterPill
            key={f.value}
            label={f.label}
            count={priorityCounts[f.value]}
            active={priority === f.value}
            onClick={() => onPriorityChange(f.value)}
          />
        ))}
      </div>
    </div>
  )
}