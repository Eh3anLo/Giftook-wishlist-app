import { vi, describe, it, expect, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock prisma before importing the service
// ---------------------------------------------------------------------------
vi.mock('@/lib/prisma.js', () => ({
  default: {
    wishlist: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    giftItem: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import prisma from '@/lib/prisma.js'
import {
  createWishlist,
  getWishlistsByUser,
  getWishlistById,
  getWishlistByShareToken,
  updateWishlist,
  deleteWishlist,
  getWishlistProgress,
} from '@/services/wishlist.service.js'
import { ValidationError, ForbiddenError } from '@/lib/errors.js'

beforeEach(() => {
  vi.clearAllMocks()
  // Default $transaction implementation that calls the callback with prisma itself
  prisma.$transaction.mockImplementation(async (cb) => cb(prisma))
})

// ---------------------------------------------------------------------------
// createWishlist
// ---------------------------------------------------------------------------
describe('createWishlist', () => {
  it('creates a wishlist with correct fields on happy path', async () => {
    const mockWishlist = {
      id: 'wl-1',
      userId: 'user-1',
      title: 'تولدم',
      description: 'هدایای تولدم',
      coverImage: null,
      occasion: 'birthday',
      visibility: 'public',
      shareToken: 'abc123defgh456ijklmno',
      showReserverIdentity: false,
    }
    prisma.wishlist.create.mockResolvedValue(mockWishlist)

    const result = await createWishlist('user-1', {
      title: 'تولدم',
      description: 'هدایای تولدم',
      occasion: 'birthday',
      visibility: 'public',
    })

    expect(prisma.wishlist.create).toHaveBeenCalledOnce()
    const callData = prisma.wishlist.create.mock.calls[0][0].data
    expect(callData.userId).toBe('user-1')
    expect(callData.title).toBe('تولدم')
    expect(callData.description).toBe('هدایای تولدم')
    expect(callData.occasion).toBe('birthday')
    expect(callData.visibility).toBe('public')
    expect(callData.shareToken).toBeTruthy()
    expect(callData.showReserverIdentity).toBe(false)
    expect(result).toEqual(mockWishlist)
  })

  it('generates a shareToken that is present', async () => {
    prisma.wishlist.create.mockResolvedValue({ shareToken: 'tok' })

    await createWishlist('user-1', { title: 'عنوان' })

    const callData = prisma.wishlist.create.mock.calls[0][0].data
    expect(typeof callData.shareToken).toBe('string')
    expect(callData.shareToken.length).toBeGreaterThan(0)
  })

  it('defaults showReserverIdentity to false when not provided', async () => {
    prisma.wishlist.create.mockResolvedValue({})

    await createWishlist('user-1', { title: 'عنوان' })

    const callData = prisma.wishlist.create.mock.calls[0][0].data
    expect(callData.showReserverIdentity).toBe(false)
  })

  it('throws ValidationError for empty title', async () => {
    await expect(createWishlist('user-1', { title: '' })).rejects.toThrow(ValidationError)
    expect(prisma.wishlist.create).not.toHaveBeenCalled()
  })

  it('throws ValidationError for title longer than 100 chars', async () => {
    const longTitle = 'ا'.repeat(101)
    await expect(createWishlist('user-1', { title: longTitle })).rejects.toThrow(ValidationError)
    expect(prisma.wishlist.create).not.toHaveBeenCalled()
  })

  it('throws ValidationError for description longer than 500 chars', async () => {
    await expect(
      createWishlist('user-1', { title: 'عنوان', description: 'ب'.repeat(501) })
    ).rejects.toThrow(ValidationError)
    expect(prisma.wishlist.create).not.toHaveBeenCalled()
  })

  it('throws ValidationError for invalid coverImage URL', async () => {
    await expect(
      createWishlist('user-1', { title: 'عنوان', coverImage: 'not-a-url' })
    ).rejects.toThrow(ValidationError)
    expect(prisma.wishlist.create).not.toHaveBeenCalled()
  })

  it('throws ValidationError for invalid visibility', async () => {
    await expect(
      createWishlist('user-1', { title: 'عنوان', visibility: 'secret' })
    ).rejects.toThrow(ValidationError)
    expect(prisma.wishlist.create).not.toHaveBeenCalled()
  })

  it('throws ValidationError for invalid occasion', async () => {
    await expect(
      createWishlist('user-1', { title: 'عنوان', occasion: 'anniversary' })
    ).rejects.toThrow(ValidationError)
    expect(prisma.wishlist.create).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// getWishlistsByUser
// ---------------------------------------------------------------------------
describe('getWishlistsByUser', () => {
  it('returns paginated result with wishlists and total', async () => {
    const mockList = [
      {
        id: 'wl-1',
        title: 'عنوان اول',
        _count: { items: 3 },
        items: [
          { reservation: { id: 'res-1' } },
          { reservation: null },
          { reservation: null },
        ],
      },
      { id: 'wl-2', title: 'عنوان دوم', _count: { items: 0 }, items: [] },
    ]
    prisma.wishlist.findMany.mockResolvedValue(mockList)
    prisma.wishlist.count.mockResolvedValue(5)

    const result = await getWishlistsByUser('user-1', { page: 1, pageSize: 2 })

    // After processing, items arrays are stripped and reservedCount is added
    expect(result.wishlists[0].reservedCount).toBe(1)
    expect(result.wishlists[1].reservedCount).toBe(0)
    // items property should be stripped from the returned objects
    expect(result.wishlists[0].items).toBeUndefined()
    expect(result.total).toBe(5)
    expect(prisma.wishlist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' }, skip: 0, take: 2 })
    )
  })
})

// ---------------------------------------------------------------------------
// getWishlistById
// ---------------------------------------------------------------------------
describe('getWishlistById', () => {
  const makeWishlist = (overrides = {}) => ({
    id: 'wl-1',
    userId: 'owner-1',
    title: 'لیست تست',
    visibility: 'public',
    showReserverIdentity: false,
    items: [],
    ...overrides,
  })

  it('owner can view a private wishlist', async () => {
    const wishlist = makeWishlist({ visibility: 'private', items: [] })
    prisma.wishlist.findUnique.mockResolvedValue(wishlist)

    const result = await getWishlistById('wl-1', 'owner-1')
    expect(result).not.toBeNull()
  })

  it('non-owner throws ForbiddenError on private wishlist', async () => {
    const wishlist = makeWishlist({ visibility: 'private' })
    prisma.wishlist.findUnique.mockResolvedValue(wishlist)

    await expect(getWishlistById('wl-1', 'other-user')).rejects.toThrow(ForbiddenError)
  })

  it('owner with showReserverIdentity=true gets reserver data on reserved items', async () => {
    const wishlist = makeWishlist({
      showReserverIdentity: true,
      items: [
        {
          id: 'item-1',
          title: 'هدیه',
          reservation: { id: 'res-1', user: { name: 'علی', image: null } },
        },
      ],
    })
    prisma.wishlist.findUnique.mockResolvedValue(wishlist)

    const result = await getWishlistById('wl-1', 'owner-1')

    const item = result.items[0]
    expect(item.isReserved).toBe(true)
    expect(item.reserver).toEqual({ name: 'علی', image: null })
    expect(item.reservation).toBeUndefined()
  })

  it('owner with showReserverIdentity=false gets no reserver data', async () => {
    const wishlist = makeWishlist({
      showReserverIdentity: false,
      items: [
        {
          id: 'item-1',
          title: 'هدیه',
          reservation: { id: 'res-1', user: { name: 'علی', image: null } },
        },
      ],
    })
    prisma.wishlist.findUnique.mockResolvedValue(wishlist)

    const result = await getWishlistById('wl-1', 'owner-1')

    const item = result.items[0]
    expect(item.isReserved).toBe(true)
    expect(item.reserver).toBeUndefined()
  })

  it('non-owner never gets reserver data', async () => {
    const wishlist = makeWishlist({
      visibility: 'public',
      showReserverIdentity: true,
      items: [
        {
          id: 'item-1',
          title: 'هدیه',
          reservation: { id: 'res-1', user: { name: 'علی', image: null } },
        },
      ],
    })
    prisma.wishlist.findUnique.mockResolvedValue(wishlist)

    const result = await getWishlistById('wl-1', 'non-owner')

    const item = result.items[0]
    expect(item.isReserved).toBe(true)
    expect(item.reserver).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// getWishlistByShareToken
// ---------------------------------------------------------------------------
describe('getWishlistByShareToken', () => {
  it('returns null for private wishlist', async () => {
    prisma.wishlist.findUnique.mockResolvedValue({
      id: 'wl-1',
      visibility: 'private',
      items: [],
    })

    const result = await getWishlistByShareToken('tok123')
    expect(result).toBeNull()
  })

  it('returns data for public wishlist', async () => {
    const wishlist = {
      id: 'wl-1',
      visibility: 'public',
      items: [],
    }
    prisma.wishlist.findUnique.mockResolvedValue(wishlist)

    const result = await getWishlistByShareToken('tok123')
    expect(result).not.toBeNull()
    expect(result.id).toBe('wl-1')
  })

  it('returns data for link_only wishlist', async () => {
    const wishlist = { id: 'wl-2', visibility: 'link_only', items: [] }
    prisma.wishlist.findUnique.mockResolvedValue(wishlist)

    const result = await getWishlistByShareToken('tok456')
    expect(result).not.toBeNull()
  })

  it('never includes reserver identity in response', async () => {
    const wishlist = {
      id: 'wl-1',
      visibility: 'public',
      showReserverIdentity: true,
      items: [
        {
          id: 'item-1',
          title: 'هدیه',
          reservation: { id: 'res-1', userId: 'u-1', user: { name: 'علی', image: null } },
        },
      ],
    }
    prisma.wishlist.findUnique.mockResolvedValue(wishlist)

    const result = await getWishlistByShareToken('tok123')

    const item = result.items[0]
    expect(item.isReserved).toBe(true)
    expect(item.reservation).toBeUndefined()
    expect(item.reserver).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// updateWishlist
// ---------------------------------------------------------------------------
describe('updateWishlist', () => {
  it('owner can update a wishlist', async () => {
    const existing = {
      id: 'wl-1',
      userId: 'owner-1',
      title: 'قدیم',
      description: null,
      coverImage: null,
      occasion: null,
      visibility: 'public',
      showReserverIdentity: false,
    }
    const updated = { ...existing, title: 'جدید' }

    prisma.wishlist.findUnique.mockResolvedValue(existing)
    prisma.wishlist.update.mockResolvedValue(updated)

    const result = await updateWishlist('wl-1', 'owner-1', { title: 'جدید' })

    expect(prisma.wishlist.update).toHaveBeenCalledOnce()
    expect(result.title).toBe('جدید')
  })

  it('non-owner throws ForbiddenError', async () => {
    prisma.wishlist.findUnique.mockResolvedValue({ id: 'wl-1', userId: 'owner-1' })

    await expect(updateWishlist('wl-1', 'other-user', { title: 'تغییر' })).rejects.toThrow(
      ForbiddenError
    )
    expect(prisma.wishlist.update).not.toHaveBeenCalled()
  })

  it('partial update only changes provided fields', async () => {
    const existing = {
      id: 'wl-1',
      userId: 'owner-1',
      title: 'قدیم',
      description: 'توضیحات',
      coverImage: null,
      occasion: 'birthday',
      visibility: 'public',
      showReserverIdentity: false,
    }
    prisma.wishlist.findUnique.mockResolvedValue(existing)
    prisma.wishlist.update.mockResolvedValue({ ...existing, title: 'جدید' })

    await updateWishlist('wl-1', 'owner-1', { title: 'جدید' })

    const updateData = prisma.wishlist.update.mock.calls[0][0].data
    // Only title should be in the payload
    expect(updateData).toHaveProperty('title', 'جدید')
    expect(updateData).not.toHaveProperty('description')
    expect(updateData).not.toHaveProperty('occasion')
    expect(updateData).not.toHaveProperty('visibility')
  })
})

// ---------------------------------------------------------------------------
// deleteWishlist
// ---------------------------------------------------------------------------
describe('deleteWishlist', () => {
  it('owner can delete a wishlist', async () => {
    const existing = { id: 'wl-1', userId: 'owner-1' }
    prisma.wishlist.findUnique.mockResolvedValue(existing)
    prisma.$transaction.mockImplementation(async (cb) => {
      await cb(prisma)
    })
    prisma.wishlist.delete.mockResolvedValue(existing)

    await expect(deleteWishlist('wl-1', 'owner-1')).resolves.not.toThrow()
    expect(prisma.wishlist.delete).toHaveBeenCalledWith({ where: { id: 'wl-1' } })
  })

  it('non-owner throws ForbiddenError', async () => {
    prisma.wishlist.findUnique.mockResolvedValue({ id: 'wl-1', userId: 'owner-1' })

    await expect(deleteWishlist('wl-1', 'other-user')).rejects.toThrow(ForbiddenError)
    expect(prisma.wishlist.delete).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// getWishlistProgress
// ---------------------------------------------------------------------------
describe('getWishlistProgress', () => {
  it('returns { total: 0, reserved: 0 } for empty wishlist', async () => {
    prisma.giftItem.findMany.mockResolvedValue([])

    const result = await getWishlistProgress('wl-1')

    expect(result).toEqual({ total: 0, reserved: 0 })
  })

  it('returns correct counts for partially reserved wishlist', async () => {
    const items = [
      { id: 'i-1', reservation: { id: 'r-1' } },
      { id: 'i-2', reservation: null },
      { id: 'i-3', reservation: { id: 'r-2' } },
    ]
    prisma.giftItem.findMany.mockResolvedValue(items)

    const result = await getWishlistProgress('wl-1')

    expect(result.total).toBe(3)
    expect(result.reserved).toBe(2)
  })

  it('returns reserved === total when all items are reserved', async () => {
    const items = [
      { id: 'i-1', reservation: { id: 'r-1' } },
      { id: 'i-2', reservation: { id: 'r-2' } },
    ]
    prisma.giftItem.findMany.mockResolvedValue(items)

    const result = await getWishlistProgress('wl-empty')

    expect(result.total).toBe(2)
    expect(result.reserved).toBe(2)
  })
})
