import prisma from '@/lib/prisma.js'
import { validateGiftItem } from '@/lib/validations.js'
import { ValidationError, ForbiddenError, NotFoundError } from '@/lib/errors.js'

// ---------------------------------------------------------------------------
// addGiftItem
// ---------------------------------------------------------------------------

/**
 * Adds a new gift item to a wishlist.
 * Validates ownership then validates the item data.
 *
 * @param {string} wishlistId
 * @param {string} userId  Must be the wishlist owner
 * @param {{ title: string, description?: string, price?: number,
 *           url?: string, imageUrl?: string, priority?: string, notes?: string }} data
 * @returns {Promise<object>} Created GiftItem record
 */
export async function addGiftItem(wishlistId, userId, data) {
  const wishlist = await prisma.wishlist.findUnique({ where: { id: wishlistId } })

  if (!wishlist || wishlist.userId !== userId) {
    throw new ForbiddenError()
  }

  const validation = validateGiftItem(data)
  if (!validation.valid) {
    throw new ValidationError(validation.error, validation.field)
  }

  const { title, description, price, url, imageUrl, priority, notes } = data

  return prisma.giftItem.create({
    data: {
      wishlistId,
      title: title.trim(),
      description: description ?? null,
      price: price ?? null,
      url: url || null,
      imageUrl: imageUrl || null,
      priority: priority || null,
      notes: notes ?? null,
    },
  })
}

// ---------------------------------------------------------------------------
// getItemsByWishlist
// ---------------------------------------------------------------------------

/**
 * Returns all gift items for a wishlist with optional reserver identity.
 *
 * - If requestingUserId === wishlist.userId AND showReserverIdentity === true,
 *   reserved items expose reserver: { name, image }.
 * - In all other cases, only isReserved: boolean is exposed.
 *
 * @param {string} wishlistId
 * @param {string|null} requestingUserId
 * @returns {Promise<object[]>}
 */
export async function getItemsByWishlist(wishlistId, requestingUserId) {
  const wishlist = await prisma.wishlist.findUnique({
    where: { id: wishlistId },
    include: {
      items: {
        include: {
          reservation: {
            include: {
              user: {
                select: { name: true, image: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!wishlist) return []

  const isOwner = requestingUserId === wishlist.userId
  const revealIdentity = isOwner && wishlist.showReserverIdentity

  return wishlist.items.map((item) => {
    const isReserved = item.reservation !== null

    if (revealIdentity && isReserved) {
      return {
        ...item,
        isReserved: true,
        reserver: item.reservation.user ?? null,
        reservation: undefined,
      }
    }

    // Strip reservation details — expose only boolean flag
    const { reservation: _res, ...rest } = item
    return { ...rest, isReserved }
  })
}

// ---------------------------------------------------------------------------
// getGiftItemById
// ---------------------------------------------------------------------------

/**
 * Returns a single gift item by id, or null if not found.
 * No authorization check.
 *
 * @param {string} itemId
 * @returns {Promise<object|null>}
 */
export async function getGiftItemById(itemId) {
  return prisma.giftItem.findUnique({ where: { id: itemId } }) ?? null
}

// ---------------------------------------------------------------------------
// updateGiftItem
// ---------------------------------------------------------------------------

/**
 * Partially updates a gift item. Only fields explicitly provided in data
 * are included in the update payload.
 *
 * @param {string} itemId
 * @param {string} userId  Must be the parent wishlist owner
 * @param {{ title?: string, description?: string, price?: number,
 *           url?: string, imageUrl?: string, priority?: string, notes?: string }} data
 * @returns {Promise<object>} Updated GiftItem record
 */
export async function updateGiftItem(itemId, userId, data) {
  const item = await prisma.giftItem.findUnique({
    where: { id: itemId },
    include: { wishlist: true },
  })

  if (!item) {
    throw new NotFoundError()
  }

  if (item.wishlist.userId !== userId) {
    throw new ForbiddenError()
  }

  // Merge provided data with existing values so validation sees a complete picture
  const merged = {
    title: data.title !== undefined ? data.title : item.title,
    description: data.description !== undefined ? data.description : item.description,
    price: data.price !== undefined ? data.price : item.price,
    url: data.url !== undefined ? data.url : item.url,
    imageUrl: data.imageUrl !== undefined ? data.imageUrl : item.imageUrl,
    priority: data.priority !== undefined ? data.priority : item.priority,
    notes: data.notes !== undefined ? data.notes : item.notes,
  }

  const validation = validateGiftItem(merged)
  if (!validation.valid) {
    throw new ValidationError(validation.error, validation.field)
  }

  // Build update payload with only explicitly provided fields
  const updateData = {}
  if (data.title !== undefined) updateData.title = data.title.trim()
  if (data.description !== undefined) updateData.description = data.description
  if (data.price !== undefined) updateData.price = data.price
  if (data.url !== undefined) updateData.url = data.url || null
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null
  if (data.priority !== undefined) updateData.priority = data.priority || null
  if (data.notes !== undefined) updateData.notes = data.notes

  return prisma.giftItem.update({
    where: { id: itemId },
    data: updateData,
  })
}

// ---------------------------------------------------------------------------
// deleteGiftItem
// ---------------------------------------------------------------------------

/**
 * Deletes a gift item. The associated reservation is removed automatically
 * by Prisma cascade (onDelete: Cascade on the Reservation model).
 *
 * @param {string} itemId
 * @param {string} userId  Must be the parent wishlist owner
 * @returns {Promise<void>}
 */
export async function deleteGiftItem(itemId, userId) {
  const item = await prisma.giftItem.findUnique({
    where: { id: itemId },
    include: { wishlist: true },
  })

  if (!item) {
    throw new NotFoundError()
  }

  if (item.wishlist.userId !== userId) {
    throw new ForbiddenError()
  }

  await prisma.giftItem.delete({ where: { id: itemId } })
}
