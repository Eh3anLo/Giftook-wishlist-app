import { getFriends } from '@/services/follow.service.js'
import { getTodayJalali, daysUntilNextJalaliBirthday, formatJalaliBirthday } from '@/lib/jalaliMonths.js'

/**
 * Returns the user's mutual-follow friends who have a birthday set,
 * sorted by how soon their next birthday occurs (today first).
 *
 * @param {string} userId
 * @param {{ withinDays?: number }} [options]  Only include birthdays within
 *   this many days from today (default: no limit — all friends with a
 *   birthday set, sorted).
 * @returns {Promise<Array<{
 *   id: string, name: string|null, image: string|null,
 *   birthdayLabel: string, daysUntil: number,
 * }>>}
 */
export async function getUpcomingFriendBirthdays(userId, { withinDays } = {}) {
  const friends = await getFriends(userId)
  const today = getTodayJalali()

  const withBirthdays = friends
    .filter((f) => f.birthMonth && f.birthDay)
    .map((f) => ({
      id: f.id,
      name: f.name,
      image: f.image,
      birthdayLabel: formatJalaliBirthday(f.birthMonth, f.birthDay),
      daysUntil: daysUntilNextJalaliBirthday(today, f.birthMonth, f.birthDay),
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil)

  if (withinDays === undefined) return withBirthdays
  return withBirthdays.filter((f) => f.daysUntil <= withinDays)
}