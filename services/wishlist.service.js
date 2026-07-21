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

/**
 * Creates a new wishlist for the given user.
 * Validates all fields before touching the database.
 *
 * @param {string} userId
 * @param {{ title: string, description?: string, coverImage?: string,
 *           occasion?: string, visibility?: string, showReserverIdentity?: boolean }} data
 * @returns {Promise<object>} Created wishlist record
 */
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

/**
 * Returns a paginated list of wishlists owned by userId.
 * Each wishlist includes item and reservation counts.
 *
 * @param {string} userId
 * @param {{ page?: number, pageSize?: number, status?: 'active'|'archived'|'all' }} options
 *   status defaults to 'active' (archived: false). Pass 'archived' to see only
 *   archived lists, or 'all' to see everything regardless of archived state.
 * @returns {Promise<{ wishlists: object[], total: number }>}
 */
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
        // Include items with their reservations so we can compute reservedCount
        items: {
          select: {
            reservation: { select: { id: true } },
          },
        },
      },
    }),
    prisma.wishlist.count({ where }),
  ])

  // Compute reservedCount per wishlist and strip raw items array before returning
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

/**
 * Returns a wishlist looked up by its share token.
 * Returns null if the wishlist is private.
 * Reserver identities are NEVER exposed through this endpoint.
 * Archived wishlists are still returned here — archiving only affects the
 * owner's dashboard view, not an already-shared link.
 *
 * @param {string} shareToken
 * @returns {Promise<object|null>}
 */
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

  // Strip all reserver identity data — only expose isReserved boolean
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

/**
 * Partially updates a wishlist. Only provided fields are changed.
 * Validates ownership and field constraints.
 *
 * @param {string} wishlistId
 * @param {string} userId          Requesting user (must be owner)
 * @param {{ title?: string, description?: string, coverImage?: string,
 *           occasion?: string, visibility?: string, showReserverIdentity?: boolean }} data
 * @returns {Promise<object>}
 */
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

  // Validate only the fields that are being changed.
  // We merge with existing values so validateWishlist sees a complete picture.
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

  // Build update payload with only the explicitly provided fields
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

/**
 * Archives a wishlist (hides it from the default dashboard view).
 * Validates ownership before archiving.
 *
 * @param {string} wishlistId
 * @param {string} userId
 * @returns {Promise<object>} Updated wishlist record
 */
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

/**
 * Restores a previously archived wishlist back to the active dashboard view.
 * Validates ownership before unarchiving.
 *
 * @param {string} wishlistId
 * @param {string} userId
 * @returns {Promise<object>} Updated wishlist record
 */
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

/**
 * Deletes a wishlist and all its children (cascaded by Prisma / DB).
 * Validates ownership before deleting.
 *
 * @param {string} wishlistId
 * @param {string} userId
 * @returns {Promise<void>}
 */
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

/**
 * Returns the reservation progress for a wishlist.
 *
 * @param {string} wishlistId
 * @returns {Promise<{ total: number, reserved: number }>}
 */
export async function getWishlistProgress(wishlistId) {
  const items = await prisma.giftItem.findMany({
    where: { wishlistId },
    include: { reservation: true },
  })

  const total = items.length
  const reserved = items.filter((item) => item.reservation !== null).length

  return { total, reserved }
}