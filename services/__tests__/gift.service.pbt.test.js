/**
 * Property-based tests for the Gift Item service.
 *
 * Validates: Requirements 7.1, 7.2–7.5, 7.8, 8.1
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'

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
import { addGiftItem, updateGiftItem, deleteGiftItem } from '@/services/gift.service.js'
import { ValidationError, ForbiddenError } from '@/lib/errors.js'

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Shared arbitraries
// ---------------------------------------------------------------------------

const validTitleArb = fc.string({ minLength: 1, maxLength: 150 }).filter((s) => s.trim().length > 0)
const idArb = fc.string({ minLength: 10, maxLength: 30 }).filter((s) => s.trim().length > 0)
const validPriceArb = fc
  .float({ min: Math.fround(0.01), max: Math.fround(9999999), noNaN: true })
  .filter((n) => Number.isFinite(n) && n >= 0.01)
  .map((n) => Math.round(n * 100) / 100)
const validUrlArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .map((s) => `https://example.com/${s}`)
const VALID_PRIORITIES = ['low', 'medium', 'high']
const validPriorityArb = fc.option(fc.constantFrom(...VALID_PRIORITIES), { nil: undefined })
const validGiftItemInputArb = fc.record({
  title: validTitleArb,
  description: fc.option(fc.string({ minLength: 0, maxLength: 1000 }), { nil: undefined }),
  price: fc.option(validPriceArb, { nil: undefined }),
  url: fc.option(validUrlArb, { nil: undefined }),
  imageUrl: fc.option(validUrlArb, { nil: undefined }),
  priority: validPriorityArb,
  notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
})

// ---------------------------------------------------------------------------
// Property 8 — Created item fields match input
// Validates: Requirements 7.1, 8.1
// ---------------------------------------------------------------------------
describe('Property 8: created item fields match input', () => {
  it('wishlistId and trimmed title match the input provided', async () => {
    await fc.assert(
      fc.asyncProperty(idArb, idArb, validGiftItemInputArb, async (wishlistId, userId, input) => {
        let capturedData = null

        prisma.wishlist.findUnique.mockResolvedValue({ id: wishlistId, userId })
        prisma.giftItem.create.mockImplementation(async ({ data }) => {
          capturedData = data
          return { id: 'item-new', ...data }
        })

        await addGiftItem(wishlistId, userId, input)

        expect(capturedData).not.toBeNull()
        expect(capturedData.wishlistId).toBe(wishlistId)
        expect(capturedData.title).toBe(input.title.trim())
        vi.clearAllMocks()
      }),
      { numRuns: 30 }
    )
  })
})

// ---------------------------------------------------------------------------
// Property 9 — Invalid values rejected, valid ones pass
// Validates: Requirements 7.2–7.5
// ---------------------------------------------------------------------------
describe('Property 9: invalid values always rejected; valid values always pass', () => {
  it('empty title always throws ValidationError (no DB call)', async () => {
    await fc.assert(
      fc.asyncProperty(idArb, idArb, async (wishlistId, userId) => {
        prisma.wishlist.findUnique.mockResolvedValue({ id: wishlistId, userId })
        prisma.giftItem.create.mockResolvedValue({})

        await expect(addGiftItem(wishlistId, userId, { title: '' })).rejects.toThrow(ValidationError)
        expect(prisma.giftItem.create).not.toHaveBeenCalled()
        vi.clearAllMocks()
      }),
      { numRuns: 15 }
    )
  })

  it('title longer than 150 chars always throws ValidationError', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        fc
          .integer({ min: 151, max: 250 })
          .chain((len) => fc.string({ minLength: len, maxLength: len })),
        async (wishlistId, userId, longTitle) => {
          prisma.wishlist.findUnique.mockResolvedValue({ id: wishlistId, userId })
          prisma.giftItem.create.mockResolvedValue({})

          await expect(addGiftItem(wishlistId, userId, { title: longTitle })).rejects.toThrow(
            ValidationError
          )
          expect(prisma.giftItem.create).not.toHaveBeenCalled()
          vi.clearAllMocks()
        }
      ),
      { numRuns: 15 }
    )
  })

  it('negative price always throws ValidationError', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        fc.float({ min: Math.fround(-999999), max: Math.fround(-0.01) }),
        async (wishlistId, userId, negativePrice) => {
          prisma.wishlist.findUnique.mockResolvedValue({ id: wishlistId, userId })
          prisma.giftItem.create.mockResolvedValue({})

          await expect(
            addGiftItem(wishlistId, userId, { title: 'هدیه', price: negativePrice })
          ).rejects.toThrow(ValidationError)
          expect(prisma.giftItem.create).not.toHaveBeenCalled()
          vi.clearAllMocks()
        }
      ),
      { numRuns: 15 }
    )
  })

  it('invalid URL (not starting with http/https) always throws ValidationError', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => !s.startsWith('http://') && !s.startsWith('https://')),
        async (wishlistId, userId, badUrl) => {
          prisma.wishlist.findUnique.mockResolvedValue({ id: wishlistId, userId })
          prisma.giftItem.create.mockResolvedValue({})

          await expect(
            addGiftItem(wishlistId, userId, { title: 'هدیه', url: badUrl })
          ).rejects.toThrow(ValidationError)
          expect(prisma.giftItem.create).not.toHaveBeenCalled()
          vi.clearAllMocks()
        }
      ),
      { numRuns: 15 }
    )
  })

  it('valid inputs always pass and call prisma.giftItem.create', async () => {
    await fc.assert(
      fc.asyncProperty(idArb, idArb, validGiftItemInputArb, async (wishlistId, userId, input) => {
        prisma.wishlist.findUnique.mockResolvedValue({ id: wishlistId, userId })
        prisma.giftItem.create.mockResolvedValue({ id: 'item-ok', ...input })

        await expect(addGiftItem(wishlistId, userId, input)).resolves.not.toThrow()
        expect(prisma.giftItem.create).toHaveBeenCalledOnce()
        vi.clearAllMocks()
      }),
      { numRuns: 30 }
    )
  })
})

// ---------------------------------------------------------------------------
// Property 11 — Non-owner always gets ForbiddenError
// Validates: Requirements 7.8
// ---------------------------------------------------------------------------
describe('Property 11: non-owner always receives ForbiddenError', () => {
  it('addGiftItem throws ForbiddenError for any non-owner requester', async () => {
    await fc.assert(
      fc.asyncProperty(idArb, idArb, validGiftItemInputArb, async (ownerId, requesterId, input) => {
        fc.pre(ownerId !== requesterId)

        prisma.wishlist.findUnique.mockResolvedValue({ id: 'wl-1', userId: ownerId })

        await expect(addGiftItem('wl-1', requesterId, input)).rejects.toThrow(ForbiddenError)
        expect(prisma.giftItem.create).not.toHaveBeenCalled()
        vi.clearAllMocks()
      }),
      { numRuns: 20 }
    )
  })

  it('updateGiftItem throws ForbiddenError for any non-owner requester', async () => {
    await fc.assert(
      fc.asyncProperty(idArb, idArb, validGiftItemInputArb, async (ownerId, requesterId, input) => {
        fc.pre(ownerId !== requesterId)

        prisma.giftItem.findUnique.mockResolvedValue({
          id: 'item-1',
          title: 'هدیه',
          description: null,
          price: null,
          url: null,
          imageUrl: null,
          priority: null,
          notes: null,
          wishlistId: 'wl-1',
          wishlist: { userId: ownerId },
        })

        await expect(updateGiftItem('item-1', requesterId, input)).rejects.toThrow(ForbiddenError)
        expect(prisma.giftItem.update).not.toHaveBeenCalled()
        vi.clearAllMocks()
      }),
      { numRuns: 20 }
    )
  })

  it('deleteGiftItem throws ForbiddenError for any non-owner requester', async () => {
    await fc.assert(
      fc.asyncProperty(idArb, idArb, async (ownerId, requesterId) => {
        fc.pre(ownerId !== requesterId)

        prisma.giftItem.findUnique.mockResolvedValue({
          id: 'item-1',
          wishlistId: 'wl-1',
          wishlist: { userId: ownerId },
        })

        await expect(deleteGiftItem('item-1', requesterId)).rejects.toThrow(ForbiddenError)
        expect(prisma.giftItem.delete).not.toHaveBeenCalled()
        vi.clearAllMocks()
      }),
      { numRuns: 20 }
    )
  })
})
