import { notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth.js"
import {
  getWishlistById,
  getWishlistProgress,
} from "@/services/wishlist.service.js"
import ShareButton from "@/components/wishlist/ShareButton"
import WishlistDeleteButton from "@/components/wishlist/WishlistDeleteButton"
import GiftItemsSection from "@/components/gift/GiftItemsSection"
import CelebrationEffect from "@/components/common/CelebrationEffect"

/**
 * WishlistDetailPage — Server Component.
 * Fetches the wishlist + items and renders them.
 * Shows a completion banner when all items are reserved (Requirement 10.5).
 * Owner sees edit/delete controls and ShareButton.
 * Interactive gift item management is delegated to GiftItemsSection (Client Component).
 */

const OCCASION_LABELS = {
  birthday: "تولد",
  wedding: "عروسی",
  holiday: "تعطیلات",
  other: "سایر",
}

const VISIBILITY_LABELS = {
  public: "عمومی",
  private: "خصوصی",
  link_only: "فقط با لینک",
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const session = await auth()
  const wishlist = await getWishlistById(id, session?.user?.id ?? null).catch(
    () => null
  )
  return { title: wishlist?.title ?? "لیست آرزو" }
}

export default async function WishlistDetailPage({ params }) {
  const { id } = await params
  const session = await auth()
  const userId = session?.user?.id ?? null

  let wishlist
  try {
    wishlist = await getWishlistById(id, userId)
  } catch {
    // ForbiddenError from private wishlist
    notFound()
  }

  if (!wishlist) {
    notFound()
  }

  const isOwner = Boolean(userId && wishlist.userId === userId)

  // Fetch progress for completion banner
  const progress = await getWishlistProgress(id)
  const allReserved = progress.total > 0 && progress.total === progress.reserved

  // Check if there are active reservations (for the delete warning — Requirement 5.7)
  const hasReservations = progress.reserved > 0

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-6">
      {/* Completion banner — Requirement 10.5 */}
      {isOwner && allReserved && (
        <div
          role="status"
          className="rounded-xl border border-green-300 bg-green-50 px-5 py-4 text-center text-base font-semibold text-green-800"
        >
          🎉 تمام آیتم‌های این لیست رزرو شده‌اند!
        </div>
      )}

      {/* Header */}
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

        {/* Title + badges */}
        <div className="mb-2 flex flex-wrap items-start gap-2">
          <h1 className="flex-1 text-2xl font-bold text-foreground">
            {wishlist.title}
          </h1>
          <div className="flex flex-wrap gap-1.5">
            {wishlist.occasion && (
              <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-medium text-pink-800">
                {OCCASION_LABELS[wishlist.occasion] ?? wishlist.occasion}
              </span>
            )}
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {VISIBILITY_LABELS[wishlist.visibility] ?? wishlist.visibility}
            </span>
          </div>
        </div>

        {/* Description */}
        {wishlist.description && (
          <p className="mb-4 text-sm text-muted-foreground">
            {wishlist.description}
          </p>
        )}

        {/* Progress */}
        <div className="mb-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {progress.reserved}
          </span>{" "}
          از{" "}
          <span className="font-medium text-foreground">{progress.total}</span>{" "}
          آیتم رزرو شده
        </div>

        {/* Owner controls */}
        {isOwner && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Share button */}
            <ShareButton shareToken={wishlist.shareToken} />

            {/* Edit link */}
            <Link
              href={`/wishlists/${wishlist.id}/edit`}
              className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              ویرایش
            </Link>

            {/* Delete button */}
            <WishlistDeleteButton
              wishlistId={wishlist.id}
              hasReservations={hasReservations}
            />
          </div>
        )}
      </div>

      {/* Gift items section — interactive (add, edit, delete) */}
      <GiftItemsSection
        items={wishlist.items ?? []}
        wishlistId={wishlist.id}
        isOwner={isOwner}
        showReserverIdentity={wishlist.showReserverIdentity}
        currentUserId={userId}
      />
      <CelebrationEffect active={isOwner && wishlist.showReserverIdentity && allReserved} />
    </div>
  )
}
