import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { auth } from "@/lib/auth.js"
import ProfileShareButton from "@/components/profile/ProfileShareButton"
import { getUserById } from "@/services/user.service.js"
import { getFollowInfo, getFriends } from "@/services/follow.service.js"
import DeleteAccountButton from "@/components/common/DeleteAccountButton"
import { formatJalaliBirthday } from "@/lib/jalaliMonths.js"

/**
 * Authenticated profile page — only accessible to the signed-in user.
 * Shows name, avatar, email (self-only), bio, birthday, follower/following/
 * friend counts (linking to the full lists), and account management controls.
 */
export const metadata = {
  title: "پروفایل من",
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const user = await getUserById(session.user.id)
  if (!user) {
    redirect("/login")
  }

  const [followInfo, friends] = await Promise.all([
    getFollowInfo(session.user.id, session.user.id),
    getFriends(session.user.id),
  ])

  const displayName = user.name ?? "کاربر"
  const birthday = formatJalaliBirthday(user.birthMonth, user.birthDay)

  return (
    <main dir="rtl" className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-8 text-2xl font-bold text-foreground">پروفایل من</h1>

        {/* Avatar + name */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="relative h-24 w-24 overflow-hidden rounded-full bg-muted">
            {user.image ? (
              <Image
                src={user.image}
                alt={`تصویر پروفایل ${displayName}`}
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : (
              // Persian placeholder initials
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-muted-foreground">
                {displayName.charAt(0)}
              </div>
            )}
          </div>
          <p className="text-xl font-semibold text-foreground">{displayName}</p>
          {user.bio && (
            <p className="max-w-sm text-center text-sm text-muted-foreground">{user.bio}</p>
          )}

          {/* Follower / following / friend counts — link to the full lists */}
          <div className="flex items-center gap-4 text-sm">
            <Link href="/profile/connections?tab=followers" className="text-muted-foreground hover:underline">
              <span className="font-medium text-foreground">{followInfo.followerCount}</span> دنبال‌کننده
            </Link>
            <Link href="/profile/connections?tab=following" className="text-muted-foreground hover:underline">
              <span className="font-medium text-foreground">{followInfo.followingCount}</span> دنبال‌شونده
            </Link>
            <Link href="/profile/connections?tab=friends" className="text-muted-foreground hover:underline">
              <span className="font-medium text-foreground">{friends.length}</span> دوست
            </Link>
          </div>

          <ProfileShareButton
            userId={user.id}
            userName={user.name ?? "کاربر"}
          />
        </div>

        {/* Profile info card */}
        <div className="mb-8 rounded-lg border border-border bg-card p-6 shadow-sm">
          <dl className="space-y-4">
            <div className="flex flex-col gap-1">
              <dt className="text-sm font-medium text-muted-foreground">نام</dt>
              <dd className="text-base text-foreground">{displayName}</dd>
            </div>

            {/* Email — only visible on own profile */}
            <div className="flex flex-col gap-1">
              <dt className="text-sm font-medium text-muted-foreground">
                ایمیل
              </dt>
              <dd className="text-base text-foreground">{user.email}</dd>
            </div>

            {birthday && (
              <div className="flex flex-col gap-1">
                <dt className="text-sm font-medium text-muted-foreground">تاریخ تولد</dt>
                <dd className="text-base text-foreground">{birthday}</dd>
              </div>
            )}
          </dl>
          <div className="mt-3 flex justify-end">
            <Link
              href="/profile/edit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              ویرایش اطلاعات
            </Link>
          </div>
        </div>

        {/* Danger zone */}
        <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
          <h2 className="mb-2 text-base font-semibold text-destructive">
            منطقه خطر
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            حذف حساب غیرقابل بازگشت است. تمام آرزوها و اطلاعات شما برای همیشه
            پاک خواهند شد.
          </p>
          <DeleteAccountButton />
        </section>
      </div>
    </main>
  )
}