export const PRIORITY_FILTERS = [
  { value: 'all', label: 'همه' },
  { value: 'high', label: 'زیاد' },
  { value: 'medium', label: 'متوسط' },
  { value: 'low', label: 'کم' },
]

export const RESERVATION_FILTERS = [
  { value: 'all', label: 'همه' },
  { value: 'unreserved', label: 'رزرو نشده' },
  { value: 'reserved', label: 'رزرو شده' },
]

/**
 * Pure client-side filter for an already-loaded gift items array.
 * No network calls — filters by priority and/or reservation status.
 *
 * @param {object[]} items
 * @param {{ priority?: string, reservation?: string }} filters
 * @returns {object[]}
 */
export function filterGiftItems(items, { priority = 'all', reservation = 'all' } = {}) {
  return items.filter((item) => {
    if (priority !== 'all' && item.priority !== priority) return false
    if (reservation === 'reserved' && !item.isReserved) return false
    if (reservation === 'unreserved' && item.isReserved) return false
    return true
  })
}