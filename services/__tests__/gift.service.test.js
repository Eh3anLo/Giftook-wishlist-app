import { vi, describe, it, expect, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock prisma before importing the service
// ---------------------------------------------------------------------------
vi.mock('@/lib/prisma.js', () => ({
  default: {
    wishlist: { findUnique: vi.fn() },
    giftItem: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma.js'
import {
  addGiftItem,
  getItemsByWishlist,
  getGiftItemById,
  updateGiftItem,
  deleteGiftItem,
} from '@/services/gift.service.js'
import { ValidationError, ForbiddenError, NotFoundError } from '@/lib/errors.js'

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// addGiftItem
// ---------------------------------------------------------------------------
describe('addGiftItem', () => {
  const ownerId = 'user-1'
  const wishlistId = 'wl-1'
  const validData = { title: 'کتاب جاودانگی', price: 50000 }

  it('creates item with correct fields on happy path', async () => {
    prisma.wishlist.findUnique.mockResolvedValue({ id: wishlistId, userId: ownerId })
    prisma.giftItem.create.mockResolvedValue({ id: 'item-1', wishlistId, ...validData })

    const result = await addGiftItem(wishlistId, ownerId, validData)

    expect(prisma.giftItem.create).toHaveBeenCalledOnce()
    const callData = prisma.giftItem.create.mock.calls[0][0].data
    expect(callData.wishlistId).toBe(wishlistId)
    expect(callData.title).toBe('کتاب جاودانگی')
    expect(result.id).toBe('item-1')
  })

  it('throws ForbiddenError when wishlist found but userId mismatches', async () => {
    prisma.wishlist.findUnique.mockResolvedValue({ id: wishlistId, userId: 'other-user' })

    await expect(addGiftItem(wishlistId, ownerId, validData)).rejects.toThrow(ForbiddenError)
    expect(prisma.giftItem.create).not.toHaveBeenCalled()
  })

  it('throws ForbiddenError when wishlist not found', async () => {
    prisma.wishlist.findUnique.mockResolvedValue(null)

    await expect(addGiftItem(wishlistId, ownerId, validData)).rejects.toThrow(ForbiddenError)
    expect(prisma.giftItem.create).not.toHaveBeenCalled()
  })

  it('throws ValidationError for empty title without DB write', async () => {
    prisma.wishlist.findUnique.mockResolvedValue({ id: wishlistId, userId: ownerId })

    await expect(addGiftItem(wishlistId, ownerId, { title: '' })).rejects.toThrow(ValidationError)
    expect(prisma.giftItem.create).not.toHaveBeenCalled()
  })

  it('throws ValidationError for title longer than 150 chars', async () => {
    prisma.wishlist.findUnique.mockResolvedValue({ id: wishlistId, userId: ownerId })
    const longTitle = 'ا'.repeat(151)

    await expect(addGiftItem(wishlistId, ownerId, { title: longTitle })).rejects.toThrow(
      ValidationError
    )
    expect(prisma.giftItem.create).not.toHaveBeenCalled()
  })

  it('throws ValidationError for negative price', async () => {
    prisma.wishlist.findUnique.mockResolvedValue({ id: wishlistId, userId: ownerId })

    await expect(
      addGiftItem(wishlistId, ownerId, { title: 'هدیه', price: -10 })
    ).rejects.toThrow(ValidationError)
    expect(prisma.giftItem.create).not.toHaveBeenCalled()
  })

  it('throws ValidationError for invalid URL format', async () => {
    prisma.wishlist.findUnique.mockResolvedValue({ id: wishlistId, userId: ownerId })

    await expect(
      addGiftItem(wishlistId, ownerId, { title: 'هدیه', url: 'not-a-url' })
    ).rejects.toThrow(ValidationError)
    expect(prisma.giftItem.create).not.toHaveBeenCalled()
  })

  it('throws ValidationError for invalid imageUrl format', async () => {
    prisma.wishlist.findUnique.mockResolvedValue({ id: wishlistId, userId: ownerId })

    await expect(
      addGiftItem(wishlistId, ownerId, { title: 'هدیه', imageUrl: 'ftp://invalid.com/img.jpg' })
    ).rejects.toThrow(ValidationError)
    expect(prisma.giftItem.create).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// getItemsByWishlist
// ---------------------------------------------------------------------------
describe('getItemsByWishlist', () => {
  const ownerId = 'owner-1'
  const reservedItem = {
    id: 'item-1',
    title: 'هدیه محفوظ',
    reservation: { id: 'res-1', user: { name: 'علی', image: null } },
  }
  const unreservedItem = {
    id: 'item-2',
    title: 'هدیه آزاد',
    reservation: null,
  }

  const makeWishlist = (overrides = {}) => ({
    id: 'wl-1',
    userId: ownerId,
    showReserverIdentity: false,
    items: [reservedItem, unreservedItem],
    ...overrides,
  })

  it('owner with showReserverIdentity=true gets reserver { name, image } on reserved items', async () => {
    prisma.wishlist.findUnique.mockResolvedValue(
      makeWishlist({ showReserverIdentity: true })
    )

    const items = await getItemsByWishlist('wl-1', ownerId)

    const reserved = items.find((i) => i.id === 'item-1')
    expect(reserved.isReserved).toBe(true)
    expect(reserved.reserver).toEqual({ name: 'علی', image: null })
    expect(reserved.reservation).toBeUndefined()
  })

  it('owner with showReserverIdentity=false gets no reserver data', async () => {
    prisma.wishlist.findUnique.mockResolvedValue(
      makeWishlist({ showReserverIdentity: false })
    )

    const items = await getItemsByWishlist('wl-1', ownerId)

    for (const item of items) {
      expect(Object.prototype.hasOwnProperty.call(item, 'reserver')).toBe(false)
      expect(Object.prototype.hasOwnProperty.call(item, 'reservation')).toBe(false)
    }
  })

  it('non-owner never gets reserver data even when showReserverIdentity=true', async () => {
    prisma.wishlist.findUnique.mockResolvedValue(
      makeWishlist({ showReserverIdentity: true })
    )

    const items = await getItemsByWishlist('wl-1', 'non-owner')

    for (const item of items) {
      expect(Object.prototype.hasOwnProperty.call(item, 'reserver')).toBe(false)
    }
  })

  it('all items have isReserved boolean', async () => {
    prisma.wishlist.findUnique.mockResolvedValue(makeWishlist())

    const items = await getItemsByWishlist('wl-1', ownerId)

    for (const item of items) {
      expect(typeof item.isReserved).toBe('boolean')
    }
  })

  it('unreserved items have isReserved: false', async () => {
    prisma.wishlist.findUnique.mockResolvedValue(makeWishlist())

    const items = await getItemsByWishlist('wl-1', ownerId)

    const unreserved = items.find((i) => i.id === 'item-2')
    expect(unreserved.isReserved).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getGiftItemById
// ---------------------------------------------------------------------------
describe('getGiftItemById', () => {
  it('returns item when found', async () => {
    const mockItem = { id: 'item-1', title: 'هدیه' }
    prisma.giftItem.findUnique.mockResolvedValue(mockItem)

    const result = await getGiftItemById('item-1')

    expect(result).toEqual(mockItem)
  })

  it('returns null when not found', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(null)

    const result = await getGiftItemById('missing-id')

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// updateGiftItem
// ---------------------------------------------------------------------------
describe('updateGiftItem', () => {
  const ownerId = 'user-1'
  const existingItem = {
    id: 'item-1',
    title: 'قدیمی',
    description: 'توضیح قبلی',
    price: null,
    url: null,
    imageUrl: null,
    priority: null,
    notes: null,
    wishlist: { userId: ownerId },
  }

  it('owner can update with only provided fields (partial update)', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(existingItem)
    prisma.giftItem.update.mockResolvedValue({ ...existingItem, title: 'جدید' })

    await updateGiftItem('item-1', ownerId, { title: 'جدید' })

    const updateData = prisma.giftItem.update.mock.calls[0][0].data
    expect(updateData).toHaveProperty('title', 'جدید')
    expect(updateData).not.toHaveProperty('description')
    expect(updateData).not.toHaveProperty('price')
    expect(updateData).not.toHaveProperty('url')
    expect(updateData).not.toHaveProperty('priority')
  })

  it('throws ForbiddenError for non-owner', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(existingItem)

    await expect(updateGiftItem('item-1', 'other-user', { title: 'جدید' })).rejects.toThrow(
      ForbiddenError
    )
    expect(prisma.giftItem.update).not.toHaveBeenCalled()
  })

  it('throws NotFoundError when item not found', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(null)

    await expect(updateGiftItem('missing', ownerId, { title: 'جدید' })).rejects.toThrow(
      NotFoundError
    )
    expect(prisma.giftItem.update).not.toHaveBeenCalled()
  })

  it('throws ValidationError for invalid title', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(existingItem)

    await expect(updateGiftItem('item-1', ownerId, { title: '' })).rejects.toThrow(ValidationError)
    expect(prisma.giftItem.update).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// deleteGiftItem
// ---------------------------------------------------------------------------
describe('deleteGiftItem', () => {
  const ownerId = 'user-1'
  const existingItem = {
    id: 'item-1',
    wishlist: { userId: ownerId },
  }

  it('owner can delete item', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(existingItem)
    prisma.giftItem.delete.mockResolvedValue(existingItem)

    await expect(deleteGiftItem('item-1', ownerId)).resolves.not.toThrow()
    expect(prisma.giftItem.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } })
  })

  it('throws ForbiddenError for non-owner', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(existingItem)

    await expect(deleteGiftItem('item-1', 'other-user')).rejects.toThrow(ForbiddenError)
    expect(prisma.giftItem.delete).not.toHaveBeenCalled()
  })

  it('throws NotFoundError when item not found', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(null)

    await expect(deleteGiftItem('missing', ownerId)).rejects.toThrow(NotFoundError)
    expect(prisma.giftItem.delete).not.toHaveBeenCalled()
  })

  it('calls prisma.giftItem.delete with correct where clause', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(existingItem)
    prisma.giftItem.delete.mockResolvedValue(existingItem)

    await deleteGiftItem('item-1', ownerId)

    expect(prisma.giftItem.delete).toHaveBeenCalledOnce()
    expect(prisma.giftItem.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } })
  })
})
