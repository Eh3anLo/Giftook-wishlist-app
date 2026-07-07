import { auth } from '@/lib/auth.js'
import { createWishlist, getWishlistsByUser } from '@/services/wishlist.service.js'
import { handleServiceError } from '@/lib/api-helpers.js'

/**
 * GET /api/wishlists
 * Returns a paginated list of wishlists owned by the authenticated user.
 * Query params: page (default 1), pageSize (default 10)
 */
export async function GET(req) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'برای انجام این عمل باید وارد شوید.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page')) || 1
    const pageSize = Number(searchParams.get('pageSize')) || 10

    const result = await getWishlistsByUser(session.user.id, { page, pageSize })

    return Response.json(result, { status: 200 })
  } catch (error) {
    return handleServiceError(error)
  }
}

/**
 * POST /api/wishlists
 * Creates a new wishlist for the authenticated user.
 * Returns 201 with the created wishlist including shareUrl.
 */
export async function POST(req) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'برای انجام این عمل باید وارد شوید.' }, { status: 401 })
    }

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'درخواست نامعتبر است.' }, { status: 400 })
    }

    const { title, description, coverImage, occasion, visibility, showReserverIdentity } =
      body ?? {}

    const wishlist = await createWishlist(session.user.id, {
      title,
      description,
      coverImage,
      occasion,
      visibility,
      showReserverIdentity,
    })

    // Build the response shape per design document
    const responseBody = {
      id: wishlist.id,
      title: wishlist.title,
      description: wishlist.description,
      occasion: wishlist.occasion,
      visibility: wishlist.visibility,
      coverImage: wishlist.coverImage,
      shareToken: wishlist.shareToken,
      shareUrl: `/w/${wishlist.shareToken}`,
      showReserverIdentity: wishlist.showReserverIdentity,
      createdAt: wishlist.createdAt,
      itemCount: 0,
      reservedCount: 0,
    }

    return Response.json(responseBody, { status: 201 })
  } catch (error) {
    return handleServiceError(error)
  }
}
