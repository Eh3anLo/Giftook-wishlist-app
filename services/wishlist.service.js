import { nanoid } from "nanoid"
import prisma from "@/lib/prisma.js"
import { validateWishlist } from "@/lib/validations.js"
import { ValidationError, ForbiddenError } from "@/lib/errors.js"

function buildArchivedFilter(status) {
  if (status === "archived") return { archived: true }
  if (status === "all") return {}
  return { archived: false } // default: "active"
}

// ---------------------------------------------------------------------------
// createWishlist
// ---------------------------------------------------------------------------

export async function createWishlist(
  userId,
  {
    title,
    description,
    coverImage,
    occasion,
    visibility,
    showReserverIdentity,
  } = {}
) {
  const validation = validateWishlist({
    title,
    description,
    coverImage,
    occasion,
    visibility,
  })
  if (!validation.valid) {
    throw new ValidationError(validation.error, validation.field)
  }

  const shareToken = nanoid(21)

  return prisma.wishlist.create({
    data: {
      userId,
      title: title.trim(),
      description: description ?? null,
      coverImage: coverImage || null,
      occasion: occasion || null,
      visibility: visibility ?? "private",
      shareToken,
      showReserverIdentity: showReserverIdentity ?? false,
    },
  })
}

// ---------------------------------------------------------------------------
// getWishlistsByUser
// ---------------------------------------------------------------------------

export async function getWishlistsByUser(
  userId,
  { page = 1, pageSize = 10, status = "active" } = {}
) {
  const skip = (page - 1) * pageSize
  const where = { userId, ...buildArchivedFilter(status) }

  const [wishlists, total] = await Promise.all([
    prisma.wishlist.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
        items: {
          select: {
            reservation: { select: { id: true } },
          },
        },
      },
    }),
    prisma.wishlist.count({ where }),
  ])

  const wishlistsWithCounts = wishlists.map(({ items, ...wishlist }) => ({
    ...wishlist,
    reservedCount: items.filter((item) => item.reservation !== null).length,
  }))

  return { wishlists: wishlistsWithCounts, total }
}

// ---------------------------------------------------------------------------
// getWishlistById
// ---------------------------------------------------------------------------

/**
 * Returns a wishlist with its items and reservation info.
 *
 * - Private wishlists are only visible to their owner (throws ForbiddenError otherwise).
 * - If requestingUserId === wishlist.userId AND showReserverIdentity === true,
 *   reserved items expose the reserver's { name, image }.
 * - Purchase-proof fields (receiptImageUrl, shippingAddress, trackingCode)
 *   are only exposed to the wishlist owner or the reservation's own maker —
 *   NOT to every visitor, unlike message/guestName/guestEmail/guestPhone.
 * - In all other cases only isReserved: boolean is attached to each item.
 *
 * @param {string} wishlistId
 * @param {string|null} requestingUserId
 * @returns {Promise<object|null>}
 */
export async function getWishlistById(wishlistId, requestingUserId) {
  const wishlist = await prisma.wishlist.findUnique({
    where: { id: wishlistId },
    include: {
      items: {
        include: {
          reservation: {
            include: {
              user: {
                select: { id: true, name: true, image: true },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!wishlist) return null

  if (
    wishlist.visibility === "private" &&
    wishlist.userId !== requestingUserId
  ) {
    throw new ForbiddenError()
  }

  const isOwner = wishlist.userId === requestingUserId
  const revealIdentity = isOwner && wishlist.showReserverIdentity

  const items = wishlist.items.map((item) => {
    const reserved = item.reservation !== null

    if (reserved) {
      const isReservationOwner = item.reservation.userId === requestingUserId
      const canSeeProof = isOwner || isReservationOwner

      return {
        ...item,
        price: item.price?.toString() ?? null,
        isReserved: true,

        reserver: revealIdentity
          ? (item.reservation.user ?? {
              name: item.reservation.guestName,
              image: null,
              id: null,
            })
          : null,

        reservation: {
          id: item.reservation.id,

          userId: item.reservation.userId,

          guestName: item.reservation.guestName,
          guestEmail: item.reservation.guestEmail,
          guestPhone: item.reservation.guestPhone,

          message: item.reservation.message,

          receiptImageUrl: canSeeProof ? item.reservation.receiptImageUrl : null,
          shippingAddress: canSeeProof ? item.reservation.shippingAddress : null,
          trackingCode: canSeeProof ? item.reservation.trackingCode : null,

          user: revealIdentity ? item.reservation.user : null,
        },
      }
    }

    // Strip reservation details — expose only boolean flag
    return {
      ...item,
      isReserved: reserved,
      reservation: reserved
        ? {
            id: item.reservation.id,
            message: item.reservation.message,
          }
        : null,
    }
  })

  return { ...wishlist, items }
}

// ---------------------------------------------------------------------------
// getWishlistByShareToken
// ---------------------------------------------------------------------------

export async function getWishlistByShareToken(shareToken) {
  const wishlist = await prisma.wishlist.findUnique({
    where: { shareToken },
    include: {
      items: {
        include: {
          reservation: true,
        },
        orderBy: { createdAt: "asc" },
      },
      owner: {
        select: {
          name: true,
          image: true,
        },
      },
    },
  })

  if (!wishlist) return null
  if (wishlist.visibility === "private") return null

  const items = wishlist.items.map((item) => {
    return {
      ...item,
      isReserved: item.reservation !== null,
      reservation: item.reservation
        ? {
            message: item.reservation.message,
          }
        : null,
    }
  })

  return { ...wishlist, items }
}

// ---------------------------------------------------------------------------
// updateWishlist
// ---------------------------------------------------------------------------

export async function updateWishlist(
  wishlistId,
  userId,
  {
    title,
    description,
    coverImage,
    occasion,
    visibility,
    showReserverIdentity,
  } = {}
) {
  const existing = await prisma.wishlist.findUnique({
    where: { id: wishlistId },
  })

  if (!existing || existing.userId !== userId) {
    throw new ForbiddenError()
  }

  const merged = {
    title: title !== undefined ? title : existing.title,
    description: description !== undefined ? description : existing.description,
    coverImage: coverImage !== undefined ? coverImage : existing.coverImage,
    occasion: occasion !== undefined ? occasion : existing.occasion,
    visibility: visibility !== undefined ? visibility : existing.visibility,
  }

  const validation = validateWishlist(merged)
  if (!validation.valid) {
    throw new ValidationError(validation.error, validation.field)
  }

  const updateData = {}
  if (title !== undefined) updateData.title = title.trim()
  if (description !== undefined) updateData.description = description
  if (coverImage !== undefined) updateData.coverImage = coverImage || null
  if (occasion !== undefined) updateData.occasion = occasion || null
  if (visibility !== undefined) updateData.visibility = visibility
  if (showReserverIdentity !== undefined)
    updateData.showReserverIdentity = showReserverIdentity

  return prisma.wishlist.update({
    where: { id: wishlistId },
    data: updateData,
  })
}

// ---------------------------------------------------------------------------
// archiveWishlist / unarchiveWishlist
// ---------------------------------------------------------------------------

export async function archiveWishlist(wishlistId, userId) {
  const existing = await prisma.wishlist.findUnique({ where: { id: wishlistId } })

  if (!existing || existing.userId !== userId) {
    throw new ForbiddenError()
  }

  return prisma.wishlist.update({
    where: { id: wishlistId },
    data: { archived: true },
  })
}

export async function unarchiveWishlist(wishlistId, userId) {
  const existing = await prisma.wishlist.findUnique({ where: { id: wishlistId } })

  if (!existing || existing.userId !== userId) {
    throw new ForbiddenError()
  }

  return prisma.wishlist.update({
    where: { id: wishlistId },
    data: { archived: false },
  })
}

// ---------------------------------------------------------------------------
// deleteWishlist
// ---------------------------------------------------------------------------

export async function deleteWishlist(wishlistId, userId) {
  const existing = await prisma.wishlist.findUnique({
    where: { id: wishlistId },
  })

  if (!existing || existing.userId !== userId) {
    throw new ForbiddenError()
  }

  await prisma.$transaction(async (tx) => {
    await tx.wishlist.delete({ where: { id: wishlistId } })
  })
}

// ---------------------------------------------------------------------------
// getWishlistProgress
// ---------------------------------------------------------------------------

export async function getWishlistProgress(wishlistId) {
  const items = await prisma.giftItem.findMany({
    where: { wishlistId },
    include: { reservation: true },
  })

  const total = items.length
  const reserved = items.filter((item) => item.reservation !== null).length

  return { total, reserved }
}