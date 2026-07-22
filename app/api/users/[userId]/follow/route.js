import { auth } from '@/lib/auth.js'
import { followUser, unfollowUser, getFollowInfo } from '@/services/follow.service.js'
import { handleServiceError } from '@/lib/api-helpers.js'

/**
 * GET /api/users/[userId]/follow
 * Returns follower/following counts and the viewer's relationship to
 * this profile. Auth is optional — viewer-specific fields are false/null
 * when unauthenticated.
 */
export async function GET(req, { params }) {
  try {
    const { userId } = await params
    const session = await auth()
    const viewerId = session?.user?.id ?? null

    const info = await getFollowInfo(userId, viewerId)
    return Response.json(info, { status: 200 })
  } catch (error) {
    return handleServiceError(error)
  }
}

/**
 * POST /api/users/[userId]/follow
 * The authenticated user starts following [userId].
 */
export async function POST(req, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'برای دنبال‌کردن باید وارد شوید.' }, { status: 401 })
    }

    const { userId } = await params
    await followUser(session.user.id, userId)

    return new Response(null, { status: 201 })
  } catch (error) {
    return handleServiceError(error)
  }
}

/**
 * DELETE /api/users/[userId]/follow
 * The authenticated user stops following [userId].
 */
export async function DELETE(req, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'برای این عمل باید وارد شوید.' }, { status: 401 })
    }

    const { userId } = await params
    await unfollowUser(session.user.id, userId)

    return new Response(null, { status: 204 })
  } catch (error) {
    return handleServiceError(error)
  }
}