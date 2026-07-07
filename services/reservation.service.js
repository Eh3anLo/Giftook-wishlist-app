import prisma from '@/lib/prisma.js'
import { ForbiddenError, ConflictError, NotFoundError } from '@/lib/errors.js'

// ---------------------------------------------------------------------------
// createReservation
// ---------------------------------------------------------------------------

/**
 * Creates a reservation for a gift item.
 *
 * Rules:
 * - If the wishlist is private and the requesting user is not the owner → ForbiddenError.
 * - If the item is already reserved by someone else → ConflictError (409).
 * - If the item is already reserved by the same user → ConflictError (409, different message).
 * - The @unique constraint on giftItemId provides a DB-level race-condition guard.
 *
 * @param {string} giftItemId
 * @param {string} userId
 * @returns {Promise<{ id: string, giftItemId: string, createdAt: Date }>}
 *   Reservation without userId.
 */
export async function createReservation(giftItemId, userId) {
  // 1. Fetch gift item and its parent wishlist
  const giftItem = await prisma.giftItem.findUnique({
    where: { id: giftItemId },
    include: {
      wishlist: true,
      reservation: true,
    },
  })

  if (!giftItem) {
    throw new NotFoundError()
  }

  // 2. Private wishlist gate — non-owners cannot reserve
  if (giftItem.wishlist.visibility === 'private' && userId !== giftItem.wishlist.userId) {
    throw new ForbiddenError()
  }

  // 3 & 4. Check for existing reservation
  if (giftItem.reservation !== null) {
    if (giftItem.reservation.userId === userId) {
      throw new ConflictError('شما قبلاً این هدیه را رزرو کرده‌اید.')
    }
    throw new ConflictError('این هدیه قبلاً توسط شخص دیگری رزرو شده است.')
  }

  // 5. Create reservation — DB @unique on giftItemId guards against race conditions
  const reservation = await prisma.reservation.create({
    data: {
      giftItemId,
      userId,
    },
    select: {
      id: true,
      giftItemId: true,
      createdAt: true,
      // userId intentionally excluded from the return value
    },
  })

  return reservation
}

// ---------------------------------------------------------------------------
// cancelReservation
// ---------------------------------------------------------------------------

/**
 * Cancels (deletes) a reservation.
 * Only the user who made the reservation can cancel it.
 *
 * @param {string} reservationId
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function cancelReservation(reservationId, userId) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  })

  if (!reservation) {
    throw new NotFoundError()
  }

  if (reservation.userId !== userId) {
    throw new ForbiddenError()
  }

  await prisma.reservation.delete({ where: { id: reservationId } })
}

// ---------------------------------------------------------------------------
// getReservationByItem
// ---------------------------------------------------------------------------

/**
 * Returns reservation status for a gift item.
 *
 * @param {string} giftItemId
 * @param {string|null} requestingUserId
 * @param {boolean} showReserverIdentity  True when caller is the wishlist owner
 *   AND the wishlist has showReserverIdentity=true. When true, the reserver's
 *   { name, image } is included if the item is reserved.
 * @returns {Promise<{
 *   isReserved: boolean,
 *   isOwnReservation: boolean,
 *   reserver?: { name: string|null, image: string|null }
 * }>}
 */
export async function getReservationByItem(giftItemId, requestingUserId, showReserverIdentity) {
  const giftItem = await prisma.giftItem.findUnique({
    where: { id: giftItemId },
    include: {
      wishlist: true,
      reservation: {
        include: {
          user: {
            select: { name: true, image: true },
          },
        },
      },
    },
  })

  if (!giftItem) {
    throw new NotFoundError()
  }

  const reservation = giftItem.reservation

  if (!reservation) {
    return { isReserved: false, isOwnReservation: false }
  }

  const isOwnReservation = reservation.userId === requestingUserId

  // Reserver identity is only revealed when:
  // - showReserverIdentity is explicitly true
  // - AND the requestingUserId is the wishlist owner
  const isWishlistOwner = requestingUserId === giftItem.wishlist.userId
  const revealIdentity = showReserverIdentity && isWishlistOwner

  if (revealIdentity) {
    return {
      isReserved: true,
      isOwnReservation,
      reserver: reservation.user ?? null,
    }
  }

  return { isReserved: true, isOwnReservation }
}
