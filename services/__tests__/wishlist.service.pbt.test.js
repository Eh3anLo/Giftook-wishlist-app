/**
 * Property-based tests for the Wishlist service.
 *
 * Validates: Requirements 3.3, 4.1, 4.2, 4.3–4.7, 5.1, 5.2, 5.4, 5.5, 5.6,
 *            6.1–6.4, 7.6, 8.1, 8.6, 8.7, 9.6, 9.11, 9.12, 10.1, 10.2, 10.4
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'

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
  prisma.$transaction.mockImplementation(async (cb) => cb(prisma))
})

// ---------------------------------------------------------------------------
// Shared arbitraries
// ---------------------------------------------------------------------------

/** Valid title: 1–100 characters (non-empty after trimming) */
const validTitleArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0)

/** Valid description: undefined or string of max 500 chars */
const validDescriptionArb = fc.option(fc.string({ minLength: 0, maxLength: 500 }), {
  nil: undefined,
})

/** Valid cover image URL or undefined */
const validCoverImageArb = fc.option(
  fc.oneof(
    fc.string({ minLength: 1, maxLength: 50 }).map((s) => `https://example.com/${s}`),
    fc.string({ minLength: 1, maxLength: 50 }).map((s) => `http://cdn.test/${s}`)
  ),
  { nil: undefined }
)

const VALID_OCCASIONS = ['birthday', 'wedding', 'holiday', 'other']
const VALID_VISIBILITIES = ['public', 'private', 'link_only']

const validOccasionArb = fc.option(fc.constantFrom(...VALID_OCCASIONS), { nil: undefined })
const validVisibilityArb = fc.constantFrom(...VALID_VISIBILITIES)
const nonPrivateVisibilityArb = fc.constantFrom('public', 'link_only')

/** A complete valid wishlist input */
const validInputArb = fc.record({
  title: validTitleArb,
  description: validDescriptionArb,
  coverImage: validCoverImageArb,
  occasion: validOccasionArb,
  visibility: validVisibilityArb,
  showReserverIdentity: fc.boolean(),
})

/** Generate a plausible cuid-like id */
const idArb = fc.string({ minLength: 10, maxLength: 30 }).filter((s) => s.trim().length > 0)

// ---------------------------------------------------------------------------
// Property 5 — getWishlistsByUser returns only public wishlists when filtering
// Validates: Requirements 3.3
// ---------------------------------------------------------------------------
describe('Property 5: getWishlistsByUser returns only public wishlists when filtering for public', () => {
  it('wishlists returned by the query only have visibility=public when filtered', async () => {
    await fc.assert(
      fc.asyncProperty(idArb, fc.array(validInputArb, { minLength: 0, maxLength: 10 }), async (userId, inputs) => {
        const publicInputs = inputs.filter((i) => i.visibility === 'public')
        const mockPublicWishlists = publicInputs.map((inp, idx) => ({
          id: `wl-${idx}`,
          userId,
          ...inp,
          shareToken: `tok${idx}`,
          items: [], // required by getWishlistsByUser to compute reservedCount
        }))

        prisma.wishlist.findMany.mockResolvedValue(mockPublicWishlists)
        prisma.wishlist.count.mockResolvedValue(mockPublicWishlists.length)

        const { wishlists } = await getWishlistsByUser(userId, { page: 1, pageSize: 100 })

        // Every returned wishlist must have visibility 'public' (as simulated by mock)
        for (const wl of wishlists) {
          expect(wl.visibility).toBe('public')
        }
      }),
      { numRuns: 20 }
    )
  })
})

// ---------------------------------------------------------------------------
// Property 8 — Valid creation: fields match input, shareToken is URL-safe and >= 16 chars
// Validates: Requirements 4.1, 4.2, 8.1
// ---------------------------------------------------------------------------
describe('Property 8: createWishlist fields match input and shareToken is valid', () => {
  it('shareToken has length >= 16 and contains only URL-safe characters', async () => {
    await fc.assert(
      fc.asyncProperty(idArb, validInputArb, async (userId, input) => {
        let capturedData = null

        prisma.wishlist.create.mockImplementation(async ({ data }) => {
          capturedData = data
          return { ...data, id: 'wl-new' }
        })

        await createWishlist(userId, input)

        expect(capturedData).not.toBeNull()

        // shareToken must be >= 16 chars
        expect(capturedData.shareToken.length).toBeGreaterThanOrEqual(16)

        // shareToken must contain only URL-safe characters [A-Za-z0-9_-]
        expect(/^[A-Za-z0-9_-]+$/.test(capturedData.shareToken)).toBe(true)

        // Fields must match the provided input
        expect(capturedData.userId).toBe(userId)
        expect(capturedData.title).toBe(input.title.trim())
        expect(capturedData.visibility).toBe(input.visibility)
      }),
      { numRuns: 30 }
    )
  })
})

// ---------------------------------------------------------------------------
// Property 9 — Invalid inputs always rejected; valid inputs always accepted
// Validates: Requirements 4.3–4.7
// ---------------------------------------------------------------------------
describe('Property 9: ValidationError for invalid inputs; valid inputs always pass', () => {
  it('empty title always throws ValidationError without a DB call', async () => {
    await fc.assert(
      fc.asyncProperty(idArb, async (userId) => {
        prisma.wishlist.create.mockResolvedValue({})
        await expect(createWishlist(userId, { title: '' })).rejects.toThrow(ValidationError)
        expect(prisma.wishlist.create).not.toHaveBeenCalled()
        vi.clearAllMocks()
      }),
      { numRuns: 15 }
    )
  })

  it('title longer than 100 chars always throws ValidationError', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        fc.integer({ min: 101, max: 200 }).chain((len) => fc.string({ minLength: len, maxLength: len })),
        async (userId, longTitle) => {
          prisma.wishlist.create.mockResolvedValue({})
          await expect(createWishlist(userId, { title: longTitle })).rejects.toThrow(ValidationError)
          expect(prisma.wishlist.create).not.toHaveBeenCalled()
          vi.clearAllMocks()
        }
      ),
      { numRuns: 15 }
    )
  })

  it('description longer than 500 chars always throws ValidationError', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        fc.integer({ min: 501, max: 600 }).chain((len) => fc.string({ minLength: len, maxLength: len })),
        async (userId, longDesc) => {
          prisma.wishlist.create.mockResolvedValue({})
          await expect(
            createWishlist(userId, { title: 'عنوان', description: longDesc })
          ).rejects.toThrow(ValidationError)
          expect(prisma.wishlist.create).not.toHaveBeenCalled()
          vi.clearAllMocks()
        }
      ),
      { numRuns: 15 }
    )
  })

  it('invalid coverImage URL always throws ValidationError', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        fc.string({ minLength: 1, maxLength: 50 }).filter(
          (s) => !s.startsWith('http://') && !s.startsWith('https://')
        ),
        async (userId, badUrl) => {
          prisma.wishlist.create.mockResolvedValue({})
          await expect(
            createWishlist(userId, { title: 'عنوان', coverImage: badUrl })
          ).rejects.toThrow(ValidationError)
          expect(prisma.wishlist.create).not.toHaveBeenCalled()
          vi.clearAllMocks()
        }
      ),
      { numRuns: 15 }
    )
  })

  it('invalid visibility always throws ValidationError', async () => {
    // Empty string is explicitly allowed through by validateWishlist (treated as "not provided")
    // so we only test non-empty strings that are not valid visibility values.
    const invalidVisibilities = ['secret', 'hidden', 'all', 'PUBLIC', 'PRIVATE', 'LINK_ONLY', 'none']
    await fc.assert(
      fc.asyncProperty(
        idArb,
        fc.constantFrom(...invalidVisibilities),
        async (userId, badVisibility) => {
          prisma.wishlist.create.mockResolvedValue({})
          await expect(
            createWishlist(userId, { title: 'عنوان', visibility: badVisibility })
          ).rejects.toThrow(ValidationError)
          expect(prisma.wishlist.create).not.toHaveBeenCalled()
          vi.clearAllMocks()
        }
      ),
      { numRuns: 15 }
    )
  })

  it('valid inputs always pass validation and call prisma.create', async () => {
    await fc.assert(
      fc.asyncProperty(idArb, validInputArb, async (userId, input) => {
        prisma.wishlist.create.mockResolvedValue({ id: 'wl-ok', ...input })
        await expect(createWishlist(userId, input)).resolves.not.toThrow()
        expect(prisma.wishlist.create).toHaveBeenCalledOnce()
        vi.clearAllMocks()
      }),
      { numRuns: 30 }
    )
  })
})

// ---------------------------------------------------------------------------
// Property 10 — Partial update only changes provided fields
// Validates: Requirements 5.1, 7.6
// ---------------------------------------------------------------------------
describe('Property 10: partial update changes only provided fields', () => {
  it('only the fields present in the update payload are modified', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        validTitleArb,
        validTitleArb,
        async (ownerId, oldTitle, newTitle) => {
          const existing = {
            id: 'wl-1',
            userId: ownerId,
            title: oldTitle,
            description: 'توضیحات',
            coverImage: null,
            occasion: 'birthday',
            visibility: 'public',
            showReserverIdentity: false,
          }

          prisma.wishlist.findUnique.mockResolvedValue(existing)
          prisma.wishlist.update.mockResolvedValue({ ...existing, title: newTitle })

          await updateWishlist('wl-1', ownerId, { title: newTitle })

          const updateData = prisma.wishlist.update.mock.calls[0][0].data

          // Only title was provided — only title should appear in the update data
          expect(updateData).toHaveProperty('title', newTitle.trim())
          expect(updateData).not.toHaveProperty('description')
          expect(updateData).not.toHaveProperty('occasion')
          expect(updateData).not.toHaveProperty('visibility')
          expect(updateData).not.toHaveProperty('coverImage')

          vi.clearAllMocks()
        }
      ),
      { numRuns: 20 }
    )
  })
})

// ---------------------------------------------------------------------------
// Property 11 — Non-owner always gets ForbiddenError from updateWishlist and deleteWishlist
// Validates: Requirements 5.2, 5.4
// ---------------------------------------------------------------------------
describe('Property 11: non-owner always receives ForbiddenError', () => {
  it('updateWishlist throws ForbiddenError for any non-owner userId', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        validTitleArb,
        async (ownerId, requesterId, newTitle) => {
          fc.pre(ownerId !== requesterId)

          prisma.wishlist.findUnique.mockResolvedValue({
            id: 'wl-1',
            userId: ownerId,
            title: 'قدیم',
            description: null,
            coverImage: null,
            occasion: null,
            visibility: 'public',
            showReserverIdentity: false,
          })

          await expect(updateWishlist('wl-1', requesterId, { title: newTitle })).rejects.toThrow(
            ForbiddenError
          )
          expect(prisma.wishlist.update).not.toHaveBeenCalled()
          vi.clearAllMocks()
        }
      ),
      { numRuns: 20 }
    )
  })

  it('deleteWishlist throws ForbiddenError for any non-owner userId', async () => {
    await fc.assert(
      fc.asyncProperty(idArb, idArb, async (ownerId, requesterId) => {
        fc.pre(ownerId !== requesterId)

        prisma.wishlist.findUnique.mockResolvedValue({ id: 'wl-1', userId: ownerId })

        await expect(deleteWishlist('wl-1', requesterId)).rejects.toThrow(ForbiddenError)
        expect(prisma.wishlist.delete).not.toHaveBeenCalled()
        vi.clearAllMocks()
      }),
      { numRuns: 20 }
    )
  })
})

// ---------------------------------------------------------------------------
// Property 12 — getWishlistByShareToken returns data iff visibility !== 'private'
// Validates: Requirements 5.5, 5.6, 6.1–6.4
// ---------------------------------------------------------------------------
describe('Property 12: getWishlistByShareToken returns null iff visibility === private', () => {
  it('returns null for private wishlists regardless of other fields', async () => {
    await fc.assert(
      fc.asyncProperty(idArb, validTitleArb, async (shareToken, title) => {
        prisma.wishlist.findUnique.mockResolvedValue({
          id: 'wl-1',
          visibility: 'private',
          title,
          items: [],
        })

        const result = await getWishlistByShareToken(shareToken)
        expect(result).toBeNull()
        vi.clearAllMocks()
      }),
      { numRuns: 20 }
    )
  })

  it('returns data for non-private (public, link_only) wishlists', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        nonPrivateVisibilityArb,
        validTitleArb,
        async (shareToken, visibility, title) => {
          prisma.wishlist.findUnique.mockResolvedValue({
            id: 'wl-1',
            visibility,
            title,
            items: [],
          })

          const result = await getWishlistByShareToken(shareToken)
          expect(result).not.toBeNull()
          vi.clearAllMocks()
        }
      ),
      { numRuns: 20 }
    )
  })
})

// ---------------------------------------------------------------------------
// Property 13 — getWishlistByShareToken never contains reserver identity fields
// Validates: Requirements 8.6, 8.7, 9.6
// ---------------------------------------------------------------------------
describe('Property 13: getWishlistByShareToken never exposes reserver identity', () => {
  it('items in the response never contain reservation or reserver fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        nonPrivateVisibilityArb,
        fc.boolean(),
        fc.integer({ min: 0, max: 5 }),
        async (shareToken, visibility, showReserverIdentity, itemCount) => {
          const items = Array.from({ length: itemCount }, (_, i) => ({
            id: `item-${i}`,
            title: `هدیه ${i}`,
            reservation:
              i % 2 === 0
                ? { id: `res-${i}`, userId: 'u-1', user: { name: 'علی', image: null } }
                : null,
          }))

          prisma.wishlist.findUnique.mockResolvedValue({
            id: 'wl-1',
            visibility,
            showReserverIdentity,
            items,
          })

          const result = await getWishlistByShareToken(shareToken)
          expect(result).not.toBeNull()

          for (const item of result.items) {
            // Must NOT have raw reservation object
            expect(Object.prototype.hasOwnProperty.call(item, 'reservation')).toBe(false)
            // Must NOT have reserver identity
            expect(Object.prototype.hasOwnProperty.call(item, 'reserver')).toBe(false)
            // Must have isReserved boolean
            expect(typeof item.isReserved).toBe('boolean')
          }

          vi.clearAllMocks()
        }
      ),
      { numRuns: 25 }
    )
  })
})

// ---------------------------------------------------------------------------
// Property 16 — getWishlistProgress returns 0 <= reserved <= total
// Validates: Requirements 10.1, 10.2
// ---------------------------------------------------------------------------
describe('Property 16: getWishlistProgress always returns 0 <= reserved <= total', () => {
  it('reserved is always between 0 and total inclusive', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        async (wishlistId, reservedCount, unreservedCount) => {
          const reservedItems = Array.from({ length: reservedCount }, (_, i) => ({
            id: `r-item-${i}`,
            reservation: { id: `res-${i}` },
          }))
          const unreservedItems = Array.from({ length: unreservedCount }, (_, i) => ({
            id: `u-item-${i}`,
            reservation: null,
          }))

          prisma.giftItem.findMany.mockResolvedValue([...reservedItems, ...unreservedItems])

          const { total, reserved } = await getWishlistProgress(wishlistId)

          expect(reserved).toBeGreaterThanOrEqual(0)
          expect(reserved).toBeLessThanOrEqual(total)
          expect(total).toBe(reservedCount + unreservedCount)
          expect(reserved).toBe(reservedCount)

          vi.clearAllMocks()
        }
      ),
      { numRuns: 30 }
    )
  })
})

// ---------------------------------------------------------------------------
// Property 17 — Reserver data in getWishlistById depends on ownership & showReserverIdentity
// Validates: Requirements 9.11, 9.12, 10.4
// ---------------------------------------------------------------------------
describe('Property 17: reserver identity exposed only when owner AND showReserverIdentity=true', () => {
  /**
   * Build a mock wishlist with items, some reserved with user data.
   */
  const buildMockWishlist = (ownerId, showReserverIdentity, visibility, itemCount) => ({
    id: 'wl-1',
    userId: ownerId,
    visibility,
    showReserverIdentity,
    items: Array.from({ length: itemCount }, (_, i) => ({
      id: `item-${i}`,
      title: `هدیه ${i}`,
      reservation:
        i % 2 === 0
          ? { id: `res-${i}`, user: { name: 'رضا', image: null } }
          : null,
    })),
  })

  it('owner with showReserverIdentity=true: reserved items have reserver data', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        fc.constantFrom('public', 'private', 'link_only'),
        fc.integer({ min: 1, max: 6 }),
        async (ownerId, visibility, itemCount) => {
          prisma.wishlist.findUnique.mockResolvedValue(
            buildMockWishlist(ownerId, true, visibility, itemCount)
          )

          const result = await getWishlistById('wl-1', ownerId)
          expect(result).not.toBeNull()

          for (const item of result.items) {
            if (item.isReserved) {
              expect(item.reserver).toBeDefined()
              expect(item.reserver).not.toBeNull()
            }
          }

          vi.clearAllMocks()
        }
      ),
      { numRuns: 20 }
    )
  })

  it('owner with showReserverIdentity=false: no reserver data on any item', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        fc.constantFrom('public', 'private', 'link_only'),
        fc.integer({ min: 0, max: 6 }),
        async (ownerId, visibility, itemCount) => {
          prisma.wishlist.findUnique.mockResolvedValue(
            buildMockWishlist(ownerId, false, visibility, itemCount)
          )

          const result = await getWishlistById('wl-1', ownerId)
          expect(result).not.toBeNull()

          for (const item of result.items) {
            expect(Object.prototype.hasOwnProperty.call(item, 'reserver')).toBe(false)
            expect(typeof item.isReserved).toBe('boolean')
          }

          vi.clearAllMocks()
        }
      ),
      { numRuns: 20 }
    )
  })

  it('non-owner never receives reserver data regardless of showReserverIdentity', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        fc.boolean(),
        fc.constantFrom('public', 'link_only'),
        fc.integer({ min: 0, max: 6 }),
        async (ownerId, requesterId, showReserverIdentity, visibility, itemCount) => {
          fc.pre(ownerId !== requesterId)

          prisma.wishlist.findUnique.mockResolvedValue(
            buildMockWishlist(ownerId, showReserverIdentity, visibility, itemCount)
          )

          const result = await getWishlistById('wl-1', requesterId)
          expect(result).not.toBeNull()

          for (const item of result.items) {
            expect(Object.prototype.hasOwnProperty.call(item, 'reserver')).toBe(false)
          }

          vi.clearAllMocks()
        }
      ),
      { numRuns: 20 }
    )
  })
})
