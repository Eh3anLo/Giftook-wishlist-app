export const JALALI_MONTH_LABELS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

/**
 * Returns the number of days in a given Jalali (Shamsi) month, 1-indexed.
 * Months 1-6 (فروردین-شهریور) have 31 days, 7-11 (مهر-بهمن) have 30 days,
 * and 12 (اسفند) has 29 or 30 depending on leap year — since we store no
 * year for birthdays, this returns 30 for اسفند as the lenient upper bound.
 * @param {number} month  1-12
 * @returns {number}
 */
export function daysInJalaliMonth(month) {
  if (month >= 1 && month <= 6) return 31
  if (month >= 7 && month <= 11) return 30
  if (month === 12) return 30 // lenient: covers both 29 (common) and 30 (leap) year اسفند
  return 31 // fallback, should not happen given validation
}

/**
 * Formats a Jalali month/day pair as "روز ماه" (e.g. "۱۵ مهر"), or null
 * if either part is missing.
 * @param {number|null|undefined} month
 * @param {number|null|undefined} day
 * @returns {string|null}
 */
export function formatJalaliBirthday(month, day) {
  if (!month || !day) return null
  return `${day} ${JALALI_MONTH_LABELS[month - 1]}`
}

/**
 * Returns today's date as a Jalali (Shamsi) { month, day } pair, using the
 * built-in Intl Persian calendar (ca-persian) — no external library needed.
 * Relies on the runtime having full ICU data (standard in modern Node.js
 * and browsers); if that's ever missing, this could throw — acceptable
 * for a feature that's purely a "nice to have" dashboard widget.
 * @returns {{ month: number, day: number }}
 */
export function getTodayJalali() {
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    month: 'numeric',
    day: 'numeric',
  })
  const parts = formatter.formatToParts(new Date())
  const month = Number(parts.find((p) => p.type === 'month').value)
  const day = Number(parts.find((p) => p.type === 'day').value)
  return { month, day }
}

/**
 * Converts a Jalali month/day into an ordinal day-of-year (1-366),
 * using daysInJalaliMonth's lenient 30-day اسفند for both common and
 * leap years — good enough for sorting "how many days until X", not
 * intended for exact calendrical precision.
 * @param {number} month  1-12
 * @param {number} day    1-31
 * @returns {number}
 */
function ordinalDayOfJalaliYear(month, day) {
  let cumulative = 0
  for (let m = 1; m < month; m++) {
    cumulative += daysInJalaliMonth(m)
  }
  return cumulative + day
}

/**
 * Returns how many days remain until the next occurrence of a Jalali
 * month/day birthday, relative to today. Returns 0 if it's today.
 * @param {{ month: number, day: number }} today
 * @param {number} birthMonth
 * @param {number} birthDay
 * @returns {number}
 */
export function daysUntilNextJalaliBirthday(today, birthMonth, birthDay) {
  const YEAR_LENGTH = 366 // lenient — matches daysInJalaliMonth's اسفند = 30
  const todayOrdinal = ordinalDayOfJalaliYear(today.month, today.day)
  const birthOrdinal = ordinalDayOfJalaliYear(birthMonth, birthDay)

  let diff = birthOrdinal - todayOrdinal
  if (diff < 0) diff += YEAR_LENGTH
  return diff
}