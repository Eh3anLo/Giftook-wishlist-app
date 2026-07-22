import Link from 'next/link'
import Image from 'next/image'

/**
 * ConnectionsList — Server Component.
 * Renders a simple list of users (followers, following, or friends) with
 * avatar, name, and a link to their public profile. Purely presentational.
 *
 * @param {{ users: Array<{ id: string, name: string|null, image: string|null, isFriend?: boolean }>,
 *           emptyMessage: string }} props
 */
export default function ConnectionsList({ users, emptyMessage }) {
  if (!users || users.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {users.map((user) => (
        <li
          key={user.id}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
        >
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-muted">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? 'کاربر'}
                fill
                sizes="40px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-muted-foreground">
                {(user.name ?? 'ک').charAt(0)}
              </div>
            )}
          </div>

          <Link
            href={`/u/${user.id}`}
            className="flex-1 truncate text-sm font-medium text-foreground hover:underline"
          >
            {user.name ?? 'کاربر'}
          </Link>

          {user.isFriend && (
            <span className="flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              دوست
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}