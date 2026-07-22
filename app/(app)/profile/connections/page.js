import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth.js'
import { getFollowers, getFollowing, getFriends } from '@/services/follow.service.js'
import ConnectionsList from '@/components/profile/ConnectionsList'

export const metadata = {
  title: 'دنبال‌کننده‌ها و دوستان',
}

const TABS = [
  { value: 'followers', label: 'دنبال‌کننده‌ها' },
  { value: 'following', label: 'دنبال‌شونده‌ها' },
  { value: 'friends', label: 'دوستان' },
]

export default async function ConnectionsPage({ searchParams }) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const resolvedParams = await searchParams
  const tab = TABS.some((t) => t.value === resolvedParams?.tab) ? resolvedParams.tab : 'followers'

  let users = []
  let emptyMessage = ''

  if (tab === 'followers') {
    users = await getFollowers(session.user.id)
    emptyMessage = 'هنوز کسی شما را دنبال نمی‌کند.'
  } else if (tab === 'following') {
    users = await getFollowing(session.user.id)
    emptyMessage = 'هنوز کسی را دنبال نکرده‌اید.'
  } else {
    const friends = await getFriends(session.user.id)
    users = friends.map((f) => ({ ...f, isFriend: true }))
    emptyMessage = 'هنوز دوستی ندارید — دوستی زمانی شکل می‌گیرد که دو نفر همدیگر را دنبال کنند.'
  }

  return (
    <div dir="rtl" className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-foreground">دنبال‌کننده‌ها و دوستان</h1>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`?tab=${t.value}`}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.value
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <ConnectionsList users={users} emptyMessage={emptyMessage} />
    </div>
  )
}