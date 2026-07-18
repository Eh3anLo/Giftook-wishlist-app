import prisma from '@/lib/prisma.js'

const PRIORITY_LABELS = {
  low: 'کم',
  medium: 'متوسط',
  high: 'بالا',
}

/**
 * Returns aggregate stats across all of a user's wishlists:
 * total wishlists, total gift items, reserved items, overall progress
 * percentage, the most common item priority, and the most recent
 * reservation timestamp (across all their lists).
 *
 * @param {string} userId
 * @returns {Promise<{
 *   wishlistCount: number,
 *   totalItems: number,
 *   reservedItems: number,
 *   progressPercent: number,
 *   topPriority: { value: string, label: string } | null,
 *   latestReservationAt: Date | null,
 * }>}
 */
export async function getUserStats(userId) {
  const [wishlistCount, totalItems, reservedItems, priorityGroups, latestReservation] =
    await Promise.all([
      prisma.wishlist.count({ where: { userId } }),
      prisma.giftItem.count({ where: { wishlist: { userId } } }),
      prisma.reservation.count({ where: { giftItem: { wishlist: { userId } } } }),
      prisma.giftItem.groupBy({
        by: ['priority'],
        where: { wishlist: { userId }, priority: { not: null } },
        _count: { priority: true },
      }),
      prisma.reservation.findFirst({
        where: { giftItem: { wishlist: { userId } } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ])

  const progressPercent = totalItems > 0 ? Math.round((reservedItems / totalItems) * 100) : 0

  let topPriority = null
  if (priorityGroups.length > 0) {
    const top = priorityGroups.reduce((max, g) =>
      g._count.priority > max._count.priority ? g : max
    )
    topPriority = { value: top.priority, label: PRIORITY_LABELS[top.priority] ?? top.priority }
  }

  return {
    wishlistCount,
    totalItems,
    reservedItems,
    progressPercent,
    topPriority,
    latestReservationAt: latestReservation?.createdAt ?? null,
  }
}