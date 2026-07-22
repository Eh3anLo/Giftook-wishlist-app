import { notFound } from "next/navigation"
import Navbar from "@/components/layout/Navbar"
import Image from "next/image"
import Link from "next/link"
import { auth } from "@/lib/auth.js"
import { getUserPublicProfile } from "@/services/user.service.js"
import { getFollowInfo } from "@/services/follow.service.js"
import { formatJalaliBirthday } from "@/lib/jalaliMonths.js"
import FollowButton from "@/components/profile/FollowButton"

/**
 * Public user profile page — accessible to everyone, no auth required.
 * Shows name, avatar (with Persian placeholder if null), bio, birthday
 * (month/day only, Jalali calendar), follower/following counts, a follow
 * button for authenticated non-owner viewers, and public wishlists.
 * NEVER renders the user's email address.
 */
export default async function PublicProfilePage({ params }) {
  const { userId } = await params
  const profile = await getUserPublicProfile(userId)

  if (!profile) {
    notFound()
  }

  const session = await auth()
  const viewerId = session?.user?.id ?? null
  const isOwnProfile = viewerId === userId

  const followInfo = await getFollowInfo(userId, viewerId)

  const { name, image, bio, birthMonth, birthDay, wishlists } = profile
  const displayName = name ?? "کاربر"
  const birthday = formatJalaliBirthday(birthMonth, birthDay)

  return (
    <main dir="rtl" className="min-h-screen bg-background px-4">
        <Navbar />
        <div className="mx-auto max-w-3xl pt-5">
          {/* Avatar + name */}
          <div className="mb-8 flex flex-col items-center gap-4">
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-muted">
              {image ? (
                <Image
                  src={image}
                  alt={`تصویر پروفایل ${displayName}`}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                // Persian placeholder — default avatar initials
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-muted-foreground">
                  {displayName.charAt(0)}
                </div>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {displayName}
            </h1>
            {bio && (
              <p className="max-w-sm text-center text-sm text-muted-foreground">{bio}</p>
            )}
            {birthday && (
              <p className="text-xs text-muted-foreground">🎂 {birthday}</p>
            )}

            {/* Follower / following counts */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{followInfo.followerCount}</span> دنبال‌کننده
              </span>
              <span>
                <span className="font-medium text-foreground">{followInfo.followingCount}</span> دنبال‌شونده
              </span>
            </div>

            {/* Follow button — only for authenticated non-owner viewers */}
            {viewerId && !isOwnProfile && (
              <FollowButton
                targetUserId={userId}
                initialIsFollowing={followInfo.isFollowing}
                initialIsFriend={followInfo.isFriend}
              />
            )}
          </div>

          {/* Wishlists grid */}
          {wishlists.length === 0 ? (
            <p className="text-center text-muted-foreground">
              هنوز هیچ آرزوی عمومی ثبت نشده است.
            </p>
          ) : (
            <>
              <h2 className="mb-4 text-lg font-semibold text-foreground">
                آرزوها
              </h2>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {wishlists.map((wishlist) => (
                  <li key={wishlist.id}>
                    <Link
                      href={`/w/${wishlist.shareToken}`}
                      className="block rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted"
                    >
                      <h3 className="font-semibold text-foreground">
                        {wishlist.title}
                      </h3>
                      {wishlist.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {wishlist.description}
                        </p>
                      )}
                      {wishlist.occasion && (
                        <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {occasionLabel(wishlist.occasion)}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
    </main>
  )
}

/** Maps occasion enum values to Persian labels */
function occasionLabel(occasion) {
  const map = {
    birthday: "تولد",
    wedding: "عروسی",
    holiday: "تعطیلات",
    other: "سایر",
  }
  return map[occasion] ?? occasion
}