import { vi, describe, it, expect, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock prisma before importing the service
// ---------------------------------------------------------------------------
vi.mock('@/lib/prisma.js', () => ({
  default: {
    giftItem: {
      findUnique: vi.fn(),
    },
    reservation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma.js'
import {
  createReservation,
  cancelReservation,
  getReservationByItem,
} from '@/services/reservation.service.js'
import { ForbiddenError, ConflictError, NotFoundError } from '@/lib/errors.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGiftItem(overrides = {}) {
  return {
    id: 'item-1',
    wishlistId: 'wl-1',
    wishlist: {
      id: 'wl-1',
      userId: 'owner-1',
      visibility: 'public',
      showReserverIdentity: false,
    },
    reservation: null,
    ...overrides,
  }
}

function makeReservation(overrides = {}) {
  return {
    id: 'res-1',
    giftItemId: 'item-1',
    userId: 'user-1',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// createReservation
// ---------------------------------------------------------------------------
describe('createReservation', () => {
  it('happy path — returns { id, giftItemId, createdAt } without userId', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(makeGiftItem())
    prisma.reservation.create.mockResolvedValue({
      id: 'res-1',
      giftItemId: 'item-1',
      createdAt: new Date('2024-01-01T00:00:00Z'),
    })

    const result = await createReservation('item-1', 'user-1')

    expect(result).toEqual({
      id: 'res-1',
      giftItemId: 'item-1',
      createdAt: new Date('2024-01-01T00:00:00Z'),
    })
    expect(result).not.toHaveProperty('userId')
  })

  it('select clause passed to prisma.create excludes userId', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(makeGiftItem())
    prisma.reservation.create.mockResolvedValue({
      id: 'res-1',
      giftItemId: 'item-1',
      createdAt: new Date(),
    })

    await createReservation('item-1', 'user-1')

    const createCall = prisma.reservation.create.mock.calls[0][0]
    expect(createCall.select).toBeDefined()
    expect(createCall.select.userId).toBeFalsy()
    expect(createCall.select.id).toBe(true)
    expect(createCall.select.giftItemId).toBe(true)
    expect(createCall.select.createdAt).toBe(true)
  })

  it('throws ConflictError when item already reserved by another user', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(
      makeGiftItem({ reservation: { id: 'res-1', userId: 'other-user' } })
    )

    await expect(createReservation('item-1', 'user-1')).rejects.toThrow(ConflictError)
    await expect(createReservation('item-1', 'user-1')).rejects.toThrow(
      'این هدیه قبلاً توسط شخص دیگری رزرو شده است.'
    )
  })

  it('throws ConflictError (self-reservation) when same user already reserved', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(
      makeGiftItem({ reservation: { id: 'res-1', userId: 'user-1' } })
    )

    await expect(createReservation('item-1', 'user-1')).rejects.toThrow(ConflictError)
    await expect(createReservation('item-1', 'user-1')).rejects.toThrow(
      'شما قبلاً این هدیه را رزرو کرده‌اید.'
    )
  })

  it('throws ForbiddenError for non-owner on a private wishlist', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(
      makeGiftItem({
        wishlist: { id: 'wl-1', userId: 'owner-1', visibility: 'private', showReserverIdentity: false },
      })
    )

    await expect(createReservation('item-1', 'non-owner')).rejects.toThrow(ForbiddenError)
    expect(prisma.reservation.create).not.toHaveBeenCalled()
  })

  it('owner can reserve on their own private wishlist', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(
      makeGiftItem({
        wishlist: { id: 'wl-1', userId: 'owner-1', visibility: 'private', showReserverIdentity: false },
      })
    )
    prisma.reservation.create.mockResolvedValue({
      id: 'res-1',
      giftItemId: 'item-1',
      createdAt: new Date(),
    })

    await expect(createReservation('item-1', 'owner-1')).resolves.not.toThrow()
    expect(prisma.reservation.create).toHaveBeenCalledOnce()
  })

  it('throws NotFoundError when gift item does not exist', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(null)

    await expect(createReservation('nonexistent', 'user-1')).rejects.toThrow(NotFoundError)
    expect(prisma.reservation.create).not.toHaveBeenCalled()
  })

  // Requirement 9.9 — private wishlist gate
  it('Requirement 9.9: non-owner cannot see or reserve items in a private wishlist', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(
      makeGiftItem({
        wishlist: { id: 'wl-1', userId: 'owner-1', visibility: 'private', showReserverIdentity: false },
      })
    )

    await expect(createReservation('item-1', 'stranger')).rejects.toThrow(ForbiddenError)
  })
})

// ---------------------------------------------------------------------------
// cancelReservation
// ---------------------------------------------------------------------------
describe('cancelReservation', () => {
  it('happy path — deletes the reservation record', async () => {
    prisma.reservation.findUnique.mockResolvedValue(makeReservation({ userId: 'user-1' }))
    prisma.reservation.delete.mockResolvedValue({})

    await expect(cancelReservation('res-1', 'user-1')).resolves.not.toThrow()
    expect(prisma.reservation.delete).toHaveBeenCalledWith({ where: { id: 'res-1' } })
  })

  it('throws ForbiddenError when userId does not match reservation.userId', async () => {
    prisma.reservation.findUnique.mockResolvedValue(makeReservation({ userId: 'owner-user' }))

    await expect(cancelReservation('res-1', 'different-user')).rejects.toThrow(ForbiddenError)
    expect(prisma.reservation.delete).not.toHaveBeenCalled()
  })

  it('throws NotFoundError when reservation does not exist', async () => {
    prisma.reservation.findUnique.mockResolvedValue(null)

    await expect(cancelReservation('nonexistent', 'user-1')).rejects.toThrow(NotFoundError)
    expect(prisma.reservation.delete).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// getReservationByItem
// ---------------------------------------------------------------------------
describe('getReservationByItem', () => {
  it('unreserved item returns { isReserved: false, isOwnReservation: false }', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(makeGiftItem({ reservation: null }))

    const result = await getReservationByItem('item-1', 'user-1', false)

    expect(result).toEqual({ isReserved: false, isOwnReservation: false })
  })

  it('reserved item viewed by a non-owner returns isReserved: true, isOwnReservation: false, no reserver field', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(
      makeGiftItem({
        reservation: {
          id: 'res-1',
          userId: 'other-user',
          user: { name: 'علی', image: null },
        },
      })
    )

    const result = await getReservationByItem('item-1', 'viewer-user', false)

    expect(result.isReserved).toBe(true)
    expect(result.isOwnReservation).toBe(false)
    expect(result).not.toHaveProperty('reserver')
  })

  it('item reserved by the requesting user: isOwnReservation is true', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(
      makeGiftItem({
        reservation: {
          id: 'res-1',
          userId: 'user-1',
          user: { name: 'کاربر', image: null },
        },
      })
    )

    const result = await getReservationByItem('item-1', 'user-1', false)

    expect(result.isReserved).toBe(true)
    expect(result.isOwnReservation).toBe(true)
  })

  it('owner with showReserverIdentity=true: includes reserver { name, image }', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(
      makeGiftItem({
        wishlist: { id: 'wl-1', userId: 'owner-1', visibility: 'public', showReserverIdentity: true },
        reservation: {
          id: 'res-1',
          userId: 'user-1',
          user: { name: 'علی', image: 'https://example.com/ali.jpg' },
        },
      })
    )

    const result = await getReservationByItem('item-1', 'owner-1', true)

    expect(result.isReserved).toBe(true)
    expect(result.reserver).toEqual({ name: 'علی', image: 'https://example.com/ali.jpg' })
  })

  it('owner with showReserverIdentity=false: no reserver field', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(
      makeGiftItem({
        wishlist: { id: 'wl-1', userId: 'owner-1', visibility: 'public', showReserverIdentity: false },
        reservation: {
          id: 'res-1',
          userId: 'user-1',
          user: { name: 'علی', image: null },
        },
      })
    )

    const result = await getReservationByItem('item-1', 'owner-1', false)

    expect(result.isReserved).toBe(true)
    expect(result).not.toHaveProperty('reserver')
  })

  it('non-owner never gets reserver field even when showReserverIdentity=true', async () => {
    prisma.giftItem.findUnique.mockResolvedValue(
      makeGiftItem({
        wishlist: { id: 'wl-1', userId: 'owner-1', visibility: 'public', showReserverIdentity: true },
        reservation: {
          id: 'res-1',
          userId: 'user-1',
          user: { name: 'علی', image: null },
        },
      })
    )

    // non-owner passes showReserverIdentity=true but is not the owner
    const result = await getReservationByItem('item-1', 'non-owner', true)

    expect(result.isReserved).toBe(true)
    expect(result).not.toHaveProperty('reserver')
  })
})
