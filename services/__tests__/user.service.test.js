import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock prisma module before importing the service
vi.mock('@/lib/prisma.js', () => ({
  default: {
    user: { findUnique: vi.fn(), delete: vi.fn() },
    wishlist: { deleteMany: vi.fn() },
    reservation: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import prisma from '@/lib/prisma.js'
import {
  getUserPublicProfile,
  deleteUser,
  anonymizeUserReservations,
} from '@/services/user.service.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getUserPublicProfile', () => {
  it('never returns email or passwordHash fields', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'علی رضایی',
      image: null,
      wishlists: [],
    })

    const profile = await getUserPublicProfile('user-1')

    expect(profile).not.toHaveProperty('email')
    expect(profile).not.toHaveProperty('passwordHash')
  })

  it('returns name, image, and wishlists', async () => {
    const mockUser = {
      id: 'user-1',
      name: 'فاطمه موسوی',
      image: 'https://example.com/avatar.jpg',
      wishlists: [
        {
          id: 'wl-1',
          title: 'تولدم',
          description: null,
          coverImage: null,
          occasion: 'birthday',
          visibility: 'public',
          shareToken: 'tok123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    }
    prisma.user.findUnique.mockResolvedValue(mockUser)

    const profile = await getUserPublicProfile('user-1')

    expect(profile.name).toBe('فاطمه موسوی')
    expect(profile.wishlists).toHaveLength(1)
    expect(profile.wishlists[0].visibility).toBe('public')
  })

  it('filters out private and link_only wishlists via the Prisma where clause', async () => {
    // The service passes { where: { visibility: 'public' } } to Prisma.
    // We verify the select call includes the correct where filter.
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'کاربر',
      image: null,
      // Prisma would only return public wishlists because of the where clause;
      // here we return only public ones to simulate that behavior
      wishlists: [],
    })

    await getUserPublicProfile('user-1')

    const callArg = prisma.user.findUnique.mock.calls[0][0]
    // The select.wishlists.where must filter by visibility: 'public'
    expect(callArg.select.wishlists.where).toEqual({ visibility: 'public' })
  })

  it('returns null when user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    const profile = await getUserPublicProfile('nonexistent')

    expect(profile).toBeNull()
  })
})

describe('deleteUser', () => {
  it('calls anonymizeUserReservations within the same transaction', async () => {
    // Simulate $transaction calling the callback with a tx object
    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        reservation: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
        wishlist: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
        user: { delete: vi.fn().mockResolvedValue({ id: 'user-1' }) },
      }
      await callback(tx)
      return tx
    })

    await deleteUser('user-1')

    // $transaction must have been called
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)

    // Retrieve the tx that was passed to the callback
    // We verify by inspecting the mock call on the tx.reservation.updateMany
    const txFromCallback = await (async () => {
      let capturedTx = null
      prisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          reservation: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
          wishlist: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
          user: { delete: vi.fn().mockResolvedValue({ id: 'user-1' }) },
        }
        capturedTx = tx
        await cb(tx)
        return tx
      })
      await deleteUser('user-1')
      return capturedTx
    })()

    // anonymizeUserReservations calls tx.reservation.updateMany
    expect(txFromCallback.reservation.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { userId: null },
    })
  })

  it('calls tx.wishlist.deleteMany with the correct userId', async () => {
    let capturedTx = null
    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        reservation: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        wishlist: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
        user: { delete: vi.fn().mockResolvedValue({ id: 'user-1' }) },
      }
      capturedTx = tx
      await callback(tx)
      return tx
    })

    await deleteUser('user-1')

    expect(capturedTx.wishlist.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    })
  })

  it('calls tx.user.delete with the correct userId', async () => {
    let capturedTx = null
    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        reservation: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        wishlist: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
        user: { delete: vi.fn().mockResolvedValue({ id: 'user-1' }) },
      }
      capturedTx = tx
      await callback(tx)
      return tx
    })

    await deleteUser('user-1')

    expect(capturedTx.user.delete).toHaveBeenCalledWith({
      where: { id: 'user-1' },
    })
  })
})

describe('anonymizeUserReservations', () => {
  it('calls tx.reservation.updateMany with userId: null', async () => {
    const tx = {
      reservation: { updateMany: vi.fn().mockResolvedValue({ count: 3 }) },
    }

    await anonymizeUserReservations('user-99', tx)

    expect(tx.reservation.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-99' },
      data: { userId: null },
    })
  })
})
