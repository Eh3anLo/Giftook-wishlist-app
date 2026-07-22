import prisma from '@/lib/prisma.js'
import { ValidationError, ConflictError, NotFoundError } from '@/lib/errors.js'

// ---------------------------------------------------------------------------
// followUser
// ---------------------------------------------------------------------------

/**
 * Creates a follow relationship: followerId starts following followingId.
 *
 * @param {string} followerId
 * @param {string} followingId
 * @returns {Promise<object>} Created Follow record
 */
export async function followUser(followerId, followingId) {
  if (followerId === followingId) {
    throw new ValidationError('نمی‌توانید خودتان را دنبال کنید.', 'followingId')
  }

  const target = await prisma.user.findUnique({ where: { id: followingId } })
  if (!target) {
    throw new NotFoundError()
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  })
  if (existing) {
    throw new ConflictError('شما همین الان این کاربر را دنبال می‌کنید.')
  }

  return prisma.follow.create({
    data: { followerId, followingId },
  })
}

// ---------------------------------------------------------------------------
// unfollowUser
// ---------------------------------------------------------------------------

/**
 * Removes a follow relationship, if it exists. No-op (no error) if the
 * user wasn't being followed — makes the client-side toggle simpler.
 *
 * @param {string} followerId
 * @param {string} followingId
 * @returns {Promise<void>}
 */
export async function unfollowUser(followerId, followingId) {
  await prisma.follow.deleteMany({
    where: { followerId, followingId },
  })
}

// ---------------------------------------------------------------------------
// getFollowInfo
// ---------------------------------------------------------------------------

/**
 * Returns follower/following counts for a profile, plus the viewer's
 * relationship to that profile (if a viewer is logged in).
 *
 * @param {string} profileUserId  The profile being viewed
 * @param {string|null} viewerId  The currently authenticated user, or null
 * @returns {Promise<{
 *   followerCount: number,
 *   followingCount: number,
 *   isFollowing: boolean,   // viewer follows profileUserId
 *   isFollowedBy: boolean,  // profileUserId follows viewer
 *   isFriend: boolean,      // mutual follow
 * }>}
 */
export async function getFollowInfo(profileUserId, viewerId) {
  const [followerCount, followingCount, viewerFollowsProfile, profileFollowsViewer] =
    await Promise.all([
      prisma.follow.count({ where: { followingId: profileUserId } }),
      prisma.follow.count({ where: { followerId: profileUserId } }),
      viewerId
        ? prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: viewerId, followingId: profileUserId } },
          })
        : null,
      viewerId
        ? prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: profileUserId, followingId: viewerId } },
          })
        : null,
    ])

  const isFollowing = Boolean(viewerFollowsProfile)
  const isFollowedBy = Boolean(profileFollowsViewer)

  return {
    followerCount,
    followingCount,
    isFollowing,
    isFollowedBy,
    isFriend: isFollowing && isFollowedBy,
  }
}

// ---------------------------------------------------------------------------
// getFriends
// ---------------------------------------------------------------------------

/**
 * Returns the list of mutual-follow "friends" for a user — people they
 * follow who also follow them back.
 *
 * @param {string} userId
 * @returns {Promise<object[]>} Array of { id, name, image, birthMonth, birthDay }
 */
export async function getFriends(userId) {
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  })
  const followingIds = following.map((f) => f.followingId)

  if (followingIds.length === 0) return []

  const mutualBack = await prisma.follow.findMany({
    where: { followerId: { in: followingIds }, followingId: userId },
    select: { followerId: true },
  })
  const friendIds = mutualBack.map((f) => f.followerId)

  if (friendIds.length === 0) return []

  return prisma.user.findMany({
    where: { id: { in: friendIds } },
    select: { id: true, name: true, image: true, birthMonth: true, birthDay: true },
    orderBy: { name: 'asc' },
  })
}

// ---------------------------------------------------------------------------
// getFollowers
// ---------------------------------------------------------------------------

/**
 * Returns the list of users who follow userId, each flagged with whether
 * userId follows them back (isFriend).
 *
 * @param {string} userId
 * @returns {Promise<Array<{ id: string, name: string|null, image: string|null, isFriend: boolean }>>}
 */
export async function getFollowers(userId) {
  const [followerRows, outgoing] = await Promise.all([
    prisma.follow.findMany({
      where: { followingId: userId },
      include: { follower: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
  ])

  const followingSet = new Set(outgoing.map((f) => f.followingId))

  return followerRows.map((row) => ({
    ...row.follower,
    isFriend: followingSet.has(row.follower.id),
  }))
}

// ---------------------------------------------------------------------------
// getFollowing
// ---------------------------------------------------------------------------

/**
 * Returns the list of users that userId follows, each flagged with whether
 * they follow userId back (isFriend).
 *
 * @param {string} userId
 * @returns {Promise<Array<{ id: string, name: string|null, image: string|null, isFriend: boolean }>>}
 */
export async function getFollowing(userId) {
  const [followingRows, incoming] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: userId },
      include: { following: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.follow.findMany({ where: { followingId: userId }, select: { followerId: true } }),
  ])

  const followerSet = new Set(incoming.map((f) => f.followerId))

  return followingRows.map((row) => ({
    ...row.following,
    isFriend: followerSet.has(row.following.id),
  }))
}