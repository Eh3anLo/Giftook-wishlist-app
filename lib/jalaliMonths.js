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