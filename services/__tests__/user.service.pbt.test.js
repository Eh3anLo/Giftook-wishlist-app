/**
 * Property-based tests for user service authentication guarantees.
 *
 * Validates: Requirements 1.8, 1.11, 3.5
 */
import { vi, describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import bcrypt from 'bcryptjs'

// Mock prisma so getUserPublicProfile never hits the DB
vi.mock('@/lib/prisma.js', () => ({
  default: {
    user: { findUnique: vi.fn() },
    wishlist: { deleteMany: vi.fn() },
    reservation: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import prisma from '@/lib/prisma.js'
import { getUserPublicProfile } from '@/services/user.service.js'

/**
 * Property 2 — Validates: Requirements 1.8, 1.11
 *
 * For any valid plaintext password:
 *   - bcrypt.hash produces a value different from the plaintext
 *   - bcrypt.compare(plaintext, hash) returns true
 */
describe('Property 2: bcrypt password hashing correctness', () => {
  it('passwordHash differs from plaintext and bcrypt.compare returns true', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Passwords of at least 8 chars to satisfy registration requirements
        fc.string({ minLength: 8, maxLength: 50 }).filter((s) => s.length >= 8),
        async (password) => {
          const hash = await bcrypt.hash(password, 10) // use cost=10 for test speed

          // The hash must not equal the plaintext
          expect(hash).not.toBe(password)

          // bcrypt.compare must validate the plaintext against its own hash
          const match = await bcrypt.compare(password, hash)
          expect(match).toBe(true)
        }
      ),
      { numRuns: 5 } // keep the suite fast
    )
  })

  it('bcrypt.compare returns false for a wrong password', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 50 }).filter((s) => s.length >= 8),
        fc.string({ minLength: 8, maxLength: 50 }).filter((s) => s.length >= 8),
        async (password, wrongPassword) => {
          // Only test when the two passwords are different
          fc.pre(password !== wrongPassword)

          const hash = await bcrypt.hash(password, 10)
          const match = await bcrypt.compare(wrongPassword, hash)
          expect(match).toBe(false)
        }
      ),
      { numRuns: 5 }
    )
  })
})

/**
 * Property 6 — Validates: Requirements 3.5
 *
 * getUserPublicProfile response never contains the `email` field.
 * The service selects only { id, name, image, wishlists } — email is intentionally excluded.
 */
describe('Property 6: getUserPublicProfile never exposes email', () => {
  it('returns a profile object without an email field for any userId', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary user IDs (cuid-like strings)
        fc.string({ minLength: 1, maxLength: 30 }),
        async (userId) => {
          // Mock Prisma to return a plausible user shape (no email in the select)
          prisma.user.findUnique.mockResolvedValue({
            id: userId,
            name: 'کاربر تست',
            image: null,
            wishlists: [],
          })

          const profile = await getUserPublicProfile(userId)

          // Profile must not contain email or passwordHash
          if (profile !== null) {
            expect(Object.prototype.hasOwnProperty.call(profile, 'email')).toBe(false)
            expect(Object.prototype.hasOwnProperty.call(profile, 'passwordHash')).toBe(false)
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  it('prisma select query never includes email in the getUserPublicProfile call', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }),
        async (userId) => {
          prisma.user.findUnique.mockResolvedValue(null)

          await getUserPublicProfile(userId)

          const callArg = prisma.user.findUnique.mock.calls.at(-1)[0]
          const selectedFields = callArg?.select ?? {}

          // The select object must NOT include email or passwordHash
          expect(selectedFields).not.toHaveProperty('email')
          expect(selectedFields).not.toHaveProperty('passwordHash')
        }
      ),
      { numRuns: 5 }
    )
  })
})
