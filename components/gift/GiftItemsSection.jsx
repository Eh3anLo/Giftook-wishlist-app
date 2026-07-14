"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import GiftItemCard from "@/components/gift/GiftItemCard"
import GiftItemForm from "@/components/gift/GiftItemForm"
import GenieDialog from "./GenieDialog.jsx"

/**
 * GiftItemsSection — Client Component.
 * Wraps the gift items list and the "افزودن هدیه" button with add-form toggle.
 * Extracted from the Server Component page so that interactive state (showForm)
 * lives here while the page shell stays a Server Component.
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

  function handleAddSuccess() {
    setShowAddForm(false)
    router.refresh()
  }

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

      {/* Items list */}
      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
          هنوز هیچ آیتمی به این لیست اضافه نشده.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
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
