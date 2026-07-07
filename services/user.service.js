import prisma from '@/lib/prisma.js'

/**
 * Fetches a user by their ID.
 * Never returns passwordHash.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

/**
 * Fetches a user by their email address.
 * Includes passwordHash so the auth layer can verify credentials.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export async function getUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      passwordHash: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

/**
 * Creates a new email/password user.
 * @param {{ email: string, name?: string, passwordHash: string }} data
 * @returns {Promise<object>}
 */
export async function createUser({ email, name, passwordHash }) {
  return prisma.user.create({
    data: {
      email,
      name: name ?? null,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

/**
 * Updates a user's display name or avatar URL.
 * @param {string} id
 * @param {{ name?: string, image?: string }} data
 * @returns {Promise<object>}
 */
export async function updateUser(id, { name, image }) {
  const updateData = {}
  if (name !== undefined) updateData.name = name
  if (image !== undefined) updateData.image = image

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

/**
 * Returns the user's public-facing profile: name, image, and all public wishlists.
 * Never returns email or passwordHash.
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getUserPublicProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      image: true,
      wishlists: {
        where: { visibility: 'public' },
        select: {
          id: true,
          title: true,
          description: true,
          coverImage: true,
          occasion: true,
          visibility: true,
          shareToken: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  return user
}

/**
 * Anonymizes all reservations belonging to a user by setting userId = null.
 * Must be called within a Prisma transaction.
 * @param {string} userId
 * @param {object} tx - Prisma transaction client
 * @returns {Promise<void>}
 */
export async function anonymizeUserReservations(userId, tx) {
  await tx.reservation.updateMany({
    where: { userId },
    data: { userId: null },
  })
}

/**
 * Atomically deletes a user and all associated data:
 *   1. Anonymizes all reservations (userId → null)
 *   2. Deletes all wishlists (cascades to items and reservations)
 *   3. Deletes the user record
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function deleteUser(userId) {
  await prisma.$transaction(async (tx) => {
    // Step 1: Anonymize reservations owned by this user
    await anonymizeUserReservations(userId, tx)

    // Step 2: Delete all wishlists (Prisma cascade removes items and reservations)
    await tx.wishlist.deleteMany({
      where: { userId },
    })

    // Step 3: Delete the user record
    await tx.user.delete({
      where: { id: userId },
    })
  })
}
