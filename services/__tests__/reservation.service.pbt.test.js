/**
 * Property-based tests for the Reservation service.
 *
 * Validates: Requirements 9.1, 9.4, 9.7, 9.10
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'

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
import { ConflictError } from '@/lib/errors.js'

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Shared arbitraries
// ---------------------------------------------------------------------------

/** Plausible cuid-like ID — non-empty, trimmed */
const idArb = fc.string({ minLength: 5, maxLength: 30 }).filter((s) => s.trim().length > 0)

// ---------------------------------------------------------------------------
// Property 14 — Any createReservation on an already-reserved item throws ConflictError
// Validates: Requirements 9.1, 9.4, 9.10
// ---------------------------------------------------------------------------
describe('Property 14: createReservation on an already-reserved item always throws ConflictError', () => {
  it('ConflictError is thrown regardless of which userId attempts the second reservation', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb, // giftItemId
        idArb, // userId who made the first reservation
        idArb, // userId who attempts the second reservation
        async (giftItemId, firstUserId, secondUserId) => {
          // Simulate an item that already has a reservation (by firstUserId)
          const giftItemWithReservation = {
            id: giftItemId,
            wishlistId: 'wl-1',
            wishlist: { id: 'wl-1', userId: 'owner-1', visibility: 'public', showReserverIdentity: false },
            reservation: { id: 'res-existing', userId: firstUserId },
          }

          prisma.giftItem.findUnique.mockResolvedValue(giftItemWithReservation)

          await expect(createReservation(giftItemId, secondUserId)).rejects.toThrow(ConflictError)
          // Ensure the DB create is never called when item is already reserved
          expect(prisma.reservation.create).not.toHaveBeenCalled()

          vi.clearAllMocks()
        }
      ),
      { numRuns: 50 }
    )
  })

  it('ConflictError message differs: self-reservation vs reserved-by-another', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb, // giftItemId
        idArb, // userId
        async (giftItemId, userId) => {
          // Case A: same user tries to re-reserve
          prisma.giftItem.findUnique.mockResolvedValue({
            id: giftItemId,
            wishlistId: 'wl-1',
            wishlist: { id: 'wl-1', userId: 'owner-1', visibility: 'public', showReserverIdentity: false },
            reservation: { id: 'res-1', userId },
          })

          const selfError = await createReservation(giftItemId, userId).catch((e) => e)
          expect(selfError).toBeInstanceOf(ConflictError)
          expect(selfError.message).toBe('شما قبلاً این هدیه را رزرو کرده‌اید.')

          vi.clearAllMocks()

          // Case B: different user already reserved it (ensure IDs differ by appending '-other')
          const otherId = userId + '-other'
          prisma.giftItem.findUnique.mockResolvedValue({
            id: giftItemId,
            wishlistId: 'wl-1',
            wishlist: { id: 'wl-1', userId: 'owner-1', visibility: 'public', showReserverIdentity: false },
            reservation: { id: 'res-1', userId: otherId },
          })

          const otherError = await createReservation(giftItemId, userId).catch((e) => e)
          expect(otherError).toBeInstanceOf(ConflictError)
          expect(otherError.message).toBe('این هدیه قبلاً توسط شخص دیگری رزرو شده است.')

          vi.clearAllMocks()
        }
      ),
      { numRuns: 30 }
    )
  })
})

// ---------------------------------------------------------------------------
// Property 15 — createReservation → cancelReservation leaves the item unreserved
// Validates: Requirements 9.7
// ---------------------------------------------------------------------------
describe('Property 15: createReservation followed by cancelReservation returns the item to unreserved state', () => {
  it('after cancel, getReservationByItem returns { isReserved: false }', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb, // giftItemId
        idArb, // userId
        async (giftItemId, userId) => {
          const reservationId = `res-${giftItemId}`

          // Step 1: item is unreserved — createReservation succeeds
          prisma.giftItem.findUnique.mockResolvedValueOnce({
            id: giftItemId,
            wishlistId: 'wl-1',
            wishlist: { id: 'wl-1', userId: 'owner-1', visibility: 'public', showReserverIdentity: false },
            reservation: null,
          })
          prisma.reservation.create.mockResolvedValueOnce({
            id: reservationId,
            giftItemId,
            createdAt: new Date(),
          })

          const created = await createReservation(giftItemId, userId)
          expect(created.id).toBe(reservationId)

          // Step 2: cancelReservation succeeds (user owns the reservation)
          prisma.reservation.findUnique.mockResolvedValueOnce({
            id: reservationId,
            giftItemId,
            userId,
          })
          prisma.reservation.delete.mockResolvedValueOnce({})

          await cancelReservation(reservationId, userId)

          // Step 3: item is now unreserved — getReservationByItem returns isReserved: false
          prisma.giftItem.findUnique.mockResolvedValueOnce({
            id: giftItemId,
            wishlistId: 'wl-1',
            wishlist: { id: 'wl-1', userId: 'owner-1', visibility: 'public', showReserverIdentity: false },
            reservation: null,
          })

          const status = await getReservationByItem(giftItemId, userId, false)

          expect(status.isReserved).toBe(false)

          vi.clearAllMocks()
        }
      ),
      { numRuns: 30 }
    )
  })
})
