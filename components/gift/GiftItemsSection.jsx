"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import GiftItemCard from "@/components/gift/GiftItemCard"
import GiftItemForm from "@/components/gift/GiftItemForm"
import GenieDialog from "./GenieDialog.jsx"
import GiftItemsFilterBar from "./GiftItemsFilterBar.jsx"
import { filterGiftItems } from "@/lib/giftItemFilters.js"

/**
 * GiftItemsSection — Client Component.
 * Wraps the gift items list, the filter bar, and the "افزودن هدیه" button
 * with add-form toggle. Filtering is purely client-side over the already
 * loaded items array — no additional network requests.
 *
 * Props:
 *  - items (array): gift item objects from the service
 *  - wishlistId (string): parent wishlist id
 *  - isOwner (bool): whether the viewer owns this wishlist
 *  - showReserverIdentity (bool): from wishlist settings
 *  - currentUserId (string|null): authenticated user id, or null
 */
export default function GiftItemsSection({
  items,
  wishlistId,
  isOwner,
  showReserverIdentity,
  currentUserId,
}) {
  const router = useRouter()
  const [showAddForm, setShowAddForm] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [reservationFilter, setReservationFilter] = useState("all")

  function handleAddSuccess() {
    setShowAddForm(false)
    router.refresh()
  }

  const filteredItems = useMemo(
    () => filterGiftItems(items, { priority: priorityFilter, reservation: reservationFilter }),
    [items, priorityFilter, reservationFilter]
  )

  return (
    <section>
      {/* Section header + add button */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">آیتم‌های لیست</h2>
        {isOwner && !showAddForm && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              افزودن هدیه
            </button>
            <GenieDialog
              wishlistId={wishlistId}
              onItemAdded={() => handleAddSuccess()}
            />
          </div>
        )}
      </div>

      {/* Add item form — shown inline when toggled */}
      {isOwner && showAddForm && (
        <div className="mb-4">
          <GiftItemForm
            wishlistId={wishlistId}
            onSuccess={handleAddSuccess}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Filter bar — only worth showing once there's something to filter */}
      {items.length > 0 && (
        <GiftItemsFilterBar
          items={items}
          priority={priorityFilter}
          reservation={reservationFilter}
          onPriorityChange={setPriorityFilter}
          onReservationChange={setReservationFilter}
        />
      )}

      {/* Items list */}
      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
          هنوز هیچ آیتمی به این لیست اضافه نشده.
        </p>
      ) : filteredItems.length === 0 ? (
        <p className="rounded-xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
          هیچ آیتمی با این فیلتر مطابقت ندارد.
        </p>
      ) : (
        <ul className="space-y-3">
          {filteredItems.map((item) => (
            <li key={item.id}>
              <GiftItemCard
                item={item}
                wishlistId={wishlistId}
                isOwner={isOwner}
                showReserverIdentity={showReserverIdentity}
                currentUserId={currentUserId}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}