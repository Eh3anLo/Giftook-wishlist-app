"use client"

import { useState } from "react"
import Link from  "next/link"
import GiftItemForm from "@/components/gift/GiftItemForm"
import ReserveButton from "@/components/gift/ReserveButton"
import ConfirmDialog from "@/components/common/ConfirmDialog"
import { useRouter } from "next/navigation"

const PRIORITY_LABELS = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
}

const PRIORITY_COLORS = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
}

/**
 * GiftItemCard — Client Component.
 * Renders a single gift item with all metadata, status badges, and owner actions.
 *
 * Props:
 *  - item (object): gift item data from the service
 *  - wishlistId (string): parent wishlist id
 *  - isOwner (bool): whether the current user owns the wishlist
 *  - showReserverIdentity (bool): whether the owner has enabled identity reveal
 *  - currentUserId (string|null): the currently authenticated user id
 */
export default function GiftItemCard({
  item,
  wishlistId,
  isOwner,
  showReserverIdentity,
  currentUserId,
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleteError("")
    setDeleting(true)
    try {
      const res = await fetch(`/api/wishlists/${wishlistId}/items/${item.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDeleteError(data.error ?? "خطا در حذف هدیه.")
        return
      }
      setShowDeleteDialog(false)
      router.refresh()
    } catch {
      setDeleteError("خطا در ارتباط با سرور.")
    } finally {
      setDeleting(false)
    }
  }

  function handleEditSuccess() {
    setIsEditing(false)
    router.refresh()
  }

  console.log(item.reserver)
  // While in edit mode, render the form inline in place of the card
  if (isEditing) {
    return (
      <GiftItemForm
        wishlistId={wishlistId}
        item={item}
        onSuccess={handleEditSuccess}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        {item.imageUrl && (
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Title row + badges */}
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{item.title}</span>

            {/* Reservation status badge — Requirement 10.3 */}
            {item.isReserved ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                رزرو شده
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                رزرو نشده
              </span>
            )}

            {/* Priority badge */}
            {item.priority && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  PRIORITY_COLORS[item.priority] ?? "bg-gray-100 text-gray-800"
                }`}
              >
                اولویت: {PRIORITY_LABELS[item.priority] ?? item.priority}
              </span>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="mb-1 line-clamp-2 text-sm text-muted-foreground">
              {item.description}
            </p>
          )}

          {/* Price + link */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {item.price != null && (
              <span>
                قیمت:{" "}
                <span className="font-medium text-foreground">
                  {Number(item.price).toLocaleString("fa-IR")} تومان
                </span>
              </span>
            )}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                مشاهده لینک
              </a>
            )}
          </div>

          {/* Reserver identity — only for owner with showReserverIdentity: true (Requirement 9.11) */}
          {isOwner && showReserverIdentity && item.reserver && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>رزرو توسط:</span>
              {item.reserver.image && (
                <div className="h-5 w-5 overflow-hidden rounded-full bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.reserver.image}
                    alt={item.reserver.name ?? "رزرو کننده"}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              
              
              {item.reserver.id ? (
                <Link
                  href={`/u/${item.reserver.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {item.reserver.name ?? "کاربر ناشناس"}
                </Link>
              ) : (
                <span className="font-medium text-foreground">
                  {item.reserver.name ?? "کاربر ناشناس"}
                </span>
              )}
              {/* <span className="font-medium text-foreground">
                {item.reserver.name ?? 'کاربر ناشناس'}
              </span> */}
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <p className="mt-1 text-xs text-muted-foreground">
              یادداشت: {item.notes}
            </p>
          )}
        </div>

        {/* Actions column */}
        <div className="flex flex-shrink-0 flex-col items-end gap-2">
          {/* Owner controls: edit + delete */}
          {isOwner && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                ویرایش
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
                className="rounded-md border border-destructive/50 bg-background px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:outline-none"
              >
                حذف
              </button>
            </div>
          )}

          {/* Reserve button — shown to authenticated non-owner visitors.
              Also shown when the item is reserved by the current user so they can cancel. */}
          {!isOwner && currentUserId && (
            <ReserveButton
              giftItemId={item.id}
              reservationId={item.reservation?.id ?? null}
              isReserved={item.isReserved ?? false}
              isOwnReservation={
                item.isReserved && item.reservation?.userId === currentUserId
              }
            />
          )}
        </div>
      </div>

      {/* Delete error */}
      {deleteError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {deleteError}
        </p>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="حذف هدیه"
        description={`آیا مطمئن هستید که می‌خواهید «${item.title}» را حذف کنید؟ این عمل قابل بازگشت نیست.`}
        confirmLabel={deleting ? "در حال حذف..." : "حذف"}
        cancelLabel="انصراف"
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteDialog(false)
          setDeleteError("")
        }}
      />
    </div>
  )
}
