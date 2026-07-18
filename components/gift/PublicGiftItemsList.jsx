'use client'

import { useMemo, useState } from 'react'
import GiftItemCard from '@/components/gift/GiftItemCard'
import GiftItemsFilterBar from '@/components/gift/GiftItemsFilterBar'
import { filterGiftItems } from '@/lib/giftItemFilters.js'

/**
 * PublicGiftItemsList — Client Component.
 * Renders the gift items list for the public share page with client-side
 * filtering by priority and reservation status. No owner controls, no
 * reserver identity exposed — matches the read-only nature of the share page.
 *
 * @param {{ items: object[], wishlistId: string, currentUserId: string|null }} props
 */
export default function PublicGiftItemsList({ items, wishlistId, currentUserId }) {
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [reservationFilter, setReservationFilter] = useState('all')

  const filteredItems = useMemo(
    () => filterGiftItems(items, { priority: priorityFilter, reservation: reservationFilter }),
    [items, priorityFilter, reservationFilter]
  )

  return (
    <>
      <GiftItemsFilterBar
        items={items}
        priority={priorityFilter}
        reservation={reservationFilter}
        onPriorityChange={setPriorityFilter}
        onReservationChange={setReservationFilter}
      />

      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          هیچ آیتمی با این فیلتر مطابقت ندارد.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <GiftItemCard
              key={item.id}
              item={item}
              wishlistId={wishlistId}
              isOwner={false}
              showReserverIdentity={false}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </>
  )
}