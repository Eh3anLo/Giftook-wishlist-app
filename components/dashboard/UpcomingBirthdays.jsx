import Link from 'next/link'
import Image from 'next/image'

function daysUntilLabel(daysUntil) {
  if (daysUntil === 0) return 'امروز! 🎉'
  if (daysUntil === 1) return 'فردا'
  return `${daysUntil} روز دیگر`
}

/**
 * UpcomingBirthdays — Server Component.
 * Shows friends' upcoming birthdays (Jalali month/day), soonest first.
 * Silently renders nothing if there are no friends with a birthday set.
 *
 * @param {{ birthdays: Awaited<ReturnType<typeof import('@/services/birthday.service.js').getUpcomingFriendBirthdays>> }} props
 */
export default function UpcomingBirthdays({ birthdays }) {
  if (!birthdays || birthdays.length === 0) return null

  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-4 dark:bg-emerald-950 bg-emerald-200 dark:border-emerald-800">
      <h2 className="mb-3 text-sm font-semibold text-foreground">🎂 تولد دوستان</h2>
      <ul className="space-y-2">
        {birthdays.map((friend) => (
          <li key={friend.id} className="flex items-center gap-3">
            <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-muted">
              {friend.image ? (
                <Image
                  src={friend.image}
                  alt={friend.name ?? 'دوست'}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                  {(friend.name ?? 'د').charAt(0)}
                </div>
              )}
            </div>

            <Link
              href={`/u/${friend.id}`}
              className="flex-1 truncate text-sm font-medium text-foreground hover:underline"
            >
              {friend.name ?? 'کاربر'}
            </Link>

            <span className="flex-shrink-0 text-xs text-muted-foreground">
              {friend.birthdayLabel} — {daysUntilLabel(friend.daysUntil)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}