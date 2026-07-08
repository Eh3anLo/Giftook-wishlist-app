import { notFound } from "next/navigation"
import Image from "next/image"

import { auth } from "@/lib/auth.js"

import { getWishlistByShareToken } from "@/services/wishlist.service.js"
import GiftItemCard from "@/components/gift/GiftItemCard"
import Navbar from "@/components/layout/Navbar"
/**
 * Public wishlist share page — Server Component.
 * Accessible to unauthenticated visitors. No auth guard (middleware allows /w/*).
 * Reserver identity is NEVER exposed here (enforced by service + isOwner=false).
 */

const OCCASION_LABELS = {
  birthday: "تولد",
  wedding: "عروسی",
  holiday: "تعطیلات",
  other: "سایر",
}

export async function generateMetadata({ params }) {
  const { shareToken } = await params
  const wishlist = await getWishlistByShareToken(shareToken)
  return {
    title: wishlist ? `${wishlist.title} | گیفتوک` : "لیست آرزو | گیفتوک",
  }
}

export default async function SharePage({ params }) {
  const { shareToken } = await params

  // Read session to pass authenticated visitor's ID to GiftItemCard.
  // No auth required — unauthenticated visitors are welcome.
  const session = await auth()
  const userId = session?.user?.id ?? null

  const wishlist = await getWishlistByShareToken(shareToken)

  if (!wishlist) {
    notFound()
  }

  const items = wishlist.items ?? []

  return (
    <main dir="rtl" className="min-h-screen bg-background px-4 pb-10">
        <Navbar />
        <div className="mx-auto max-w-3xl space-y-6 pt-10">
          {/* Avatar + name */}
          <div className="mb-8 flex flex-col items-center gap-4">
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-muted">
              {wishlist.owner.image ? (
                <Image
                  src={wishlist.owner.image}
                  alt={`تصویر پروفایل ${wishlist.owner.name}`}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                // Persian placeholder — default avatar initials
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-muted-foreground">
                  {wishlist.owner.name.charAt(0)}
                </div>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {wishlist.owner.name}
            </h1>
          </div>
          {/* Header card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            {/* Cover image */}
            {wishlist.coverImage && (
              <div className="mb-4 overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={wishlist.coverImage}
                  alt={`کاور ${wishlist.title}`}
                  className="h-48 w-full object-cover"
                />
              </div>
            )}

            {/* Title + occasion badge */}
            <div className="mb-2 flex flex-wrap items-start gap-2">
              <h1 className="flex-1 text-2xl font-bold text-foreground">
                {wishlist.title}
              </h1>
              {wishlist.occasion && (
                <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-medium text-pink-800">
                  {OCCASION_LABELS[wishlist.occasion] ?? wishlist.occasion}
                </span>
              )}
            </div>

            {/* Description */}
            {wishlist.description && (
              <p className="text-sm text-muted-foreground">
                {wishlist.description}
              </p>
            )}
          </div>

          {/* Gift items */}
          {items.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              هنوز هیچ هدیه‌ای به این لیست اضافه نشده است.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <GiftItemCard
                  key={item.id}
                  item={item}
                  wishlistId={wishlist.id}
                  isOwner={false}
                  showReserverIdentity={false}
                  currentUserId={userId}
                />
              ))}
            </div>
          )}
        </div>
    </main>
  )
}
