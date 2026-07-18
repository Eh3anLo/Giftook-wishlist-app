import prisma from "@/lib/prisma.js"
import { ForbiddenError, ConflictError, NotFoundError, ValidationError } from "@/lib/errors.js"
import { notifyReservationCreated } from "@/services/notification.service.js"

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
export async function createReservation(
  giftItemId,
  userId,
  { guestName, guestEmail, guestPhone, message } = {}
) {
  // 1. Fetch gift item and its parent wishlist (including owner email for notification)
  const giftItem = await prisma.giftItem.findUnique({
    where: { id: giftItemId },
    include: {
      wishlist: {
        include: {
          owner: {
            select: { email: true },
          },
        },
      },
      reservation: true,
    },
  })

  if (!giftItem) {
    throw new NotFoundError()
  }

  // 2. Private wishlist gate — non-owners cannot reserve
  if (
    giftItem.wishlist.visibility === "private" &&
    userId !== giftItem.wishlist.userId
  ) {
    throw new ForbiddenError()
  }

  // 3 & 4. Check for existing reservation
  if (giftItem.reservation !== null) {
    if (giftItem.reservation.userId === userId) {
      throw new ConflictError("شما قبلاً این هدیه را رزرو کرده‌اید.")
    }
    throw new ConflictError("این هدیه قبلاً توسط شخص دیگری رزرو شده است.")
  }

  // 5. Create reservation — DB @unique on giftItemId guards against race conditions
  const reservation = await prisma.reservation.create({
    data: {
      giftItemId,
      userId,
      guestName,
      guestEmail,
      guestPhone,
      message,
    },
    select: {
      id: true,
      giftItemId: true,
      createdAt: true,
      // userId intentionally excluded from the return value
    },
  })

  // 6. Notify the wishlist owner (best-effort — never blocks the response)
  await notifyReservationCreated({
    ownerEmail: giftItem.wishlist.owner?.email ?? null,
    showReserverIdentity: giftItem.wishlist.showReserverIdentity,
    wishlistTitle: giftItem.wishlist.title,
    wishlistShareToken: giftItem.wishlist.shareToken,
    itemTitle: giftItem.title,
    reservation: { userId, guestName },
  })

  return reservation
}
// ---------------------------------------------------------------------------
// cancelReservation
// ---------------------------------------------------------------------------

// /**
//  * Cancels (deletes) a reservation.
//  * Only the user who made the reservation can cancel it.
//  *
//  * @param {string} reservationId
//  * @param {string} userId
//  * @returns {Promise<void>}
//  */
// export async function cancelReservation(reservationId, userId) {
//   const reservation = await prisma.reservation.findUnique({
//     where: { id: reservationId },
//   })

//   if (!reservation) {
//     throw new NotFoundError()
//   }

//   if (reservation.userId !== userId) {
//     throw new ForbiddenError()
//   }

//   await prisma.reservation.delete({ where: { id: reservationId } })
// }


/**
 * Cancels (deletes) a reservation.
 *
 * A reservation can be cancelled by:
 * - the user who made the reservation
 * - the wishlist owner
 *
 * @param {string} reservationId
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function cancelReservation(reservationId, userId) {
  console.log("im here")
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      giftItem: {
        include: {
          wishlist: true,
        },
      },
    },
  })

  if (!reservation) {
    throw new NotFoundError()
  }

  const isWishlistOwner =
    reservation.giftItem.wishlist.userId === userId

  const isReservationOwner =
    reservation.userId === userId

  if (!isWishlistOwner && !isReservationOwner) {
    throw new ForbiddenError()
  }

  await prisma.reservation.delete({
    where: {
      id: reservationId,
    },
  })
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

/**
 * Returns reservation status for a gift item.
 *
 * @param {string} giftItemId
 * @param {string|null} requestingUserId
 * @param {boolean} showReserverIdentity
 */
export async function getReservationByItem(
  giftItemId,
  requestingUserId,
  showReserverIdentity
) {
  const giftItem = await prisma.giftItem.findUnique({
    where: { id: giftItemId },
    include: {
      wishlist: true,
      reservation: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
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
    return {
      isReserved: false,
      isOwnReservation: false,
      reservationType: null,
    }
  }

  const isOwnReservation = reservation.userId === requestingUserId

  const isWishlistOwner = requestingUserId === giftItem.wishlist.userId

  const revealIdentity = showReserverIdentity && isWishlistOwner

  const reservationType = reservation.user ? "user" : "guest"

  const result = {
    isReserved: true,
    isOwnReservation,
    reservationType,
    message: reservation.message ?? null,
  }

  // اگر نمایش هویت غیرفعال باشد
  if (!revealIdentity) {
    return result
  }

  // رزرو توسط کاربر سایت
  if (reservationType === "user") {
    return {
      ...result,
      reserver: {
        id: reservation.user.id,
        name: reservation.user.name,
        image: reservation.user.image,
      },
    }
  }

  // رزرو توسط مهمان
  return {
    ...result,
    reserver: {
      id: null,
      name: reservation.guestName,
      image: null,
      email: reservation.guestEmail,
      phone: reservation.guestPhone,
    },
  }
}

// export async function getReservationByItem(
//   giftItemId,
//   requestingUserId,
//   showReserverIdentity
// ) {
//   const giftItem = await prisma.giftItem.findUnique({
//     where: { id: giftItemId },
//     include: {
//       wishlist: true,
//       reservation: {
//         include: {
//           user: {
//             select: {
//               id: true,
//               name: true,
//               image: true,
//             },
//           },
//         },
//       },
//     },
//   })

//   if (!giftItem) {
//     throw new NotFoundError()
//   }

//   const reservation = giftItem.reservation

//   if (!reservation) {
//     return { isReserved: false, isOwnReservation: false }
//   }

//   const isOwnReservation = reservation.userId === requestingUserId

//   // Reserver identity is only revealed when:
//   // - showReserverIdentity is explicitly true
//   // - AND the requestingUserId is the wishlist owner
//   const isWishlistOwner = requestingUserId === giftItem.wishlist.userId
//   const revealIdentity = showReserverIdentity && isWishlistOwner

//   if (revealIdentity) {
//     return {
//       isReserved: true,
//       isOwnReservation,
//       reserver: reservation.user ?? null,
//     }
//   }

//   return { isReserved: true, isOwnReservation }
// }

/**
 * Creates a reservation by the wishlist owner.
 *
 * The owner can:
 * - reserve the gift for themselves
 * - reserve it on behalf of another person
 *
 * @param {string} giftItemId
 * @param {string} ownerId
 * @param {{
 *   reserveForSelf: boolean,
 *   guestName?: string,
 *   guestEmail?: string,
 *   guestPhone?: string,
 *   message?: string,
 * }}
 * @returns {Promise<{ id: string, giftItemId: string, createdAt: Date }>}
 */
export async function ownerReserveGift(
  giftItemId,
  ownerId,
  { reserveForSelf, guestName, guestEmail, guestPhone, message } = {}
) {
  // Fetch gift item + wishlist + reservation
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

  // Only wishlist owner may use this method
  if (giftItem.wishlist.userId !== ownerId) {
    throw new ForbiddenError()
  }

  // Already reserved?
  if (giftItem.reservation) {
    throw new ConflictError("این هدیه قبلاً رزرو شده است.")
  }

  // Validation when reserving for another person
  if (!reserveForSelf) {
    if (!guestName || guestName.trim() === "") {
      throw new ValidationError("نام شخص رزروکننده الزامی است.", "guestName")
    }
  }

  // Create reservation
  const reservation = await prisma.reservation.create({
    data: {
      giftItemId,

      // اگر خودش رزرو کرده باشد
      userId: reserveForSelf ? ownerId : null,

      // اگر برای شخص دیگری ثبت کرده باشد
      guestName: reserveForSelf ? null : guestName?.trim(),
      guestEmail: reserveForSelf ? null : guestEmail?.trim() || null,
      guestPhone: reserveForSelf ? null : guestPhone?.trim() || null,

      // پیام اختیاری
      message: message?.trim() || null,
    },

    select: {
      id: true,
      giftItemId: true,
      createdAt: true,
    },
  })

  return reservation
}
