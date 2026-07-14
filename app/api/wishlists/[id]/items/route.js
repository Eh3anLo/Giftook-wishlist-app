import { auth } from '@/lib/auth.js'
import { getItemsByWishlist, addGiftItem } from '@/services/gift.service.js'
import { handleServiceError } from '@/lib/api-helpers.js'

/**
 * GET /api/wishlists/[id]/items
 * Returns all gift items for a wishlist.
 * Auth is optional — reserved identity is controlled by the service layer.
 */
export async function GET(req, { params }) {
  try {
    const { id } = await params
    const session = await auth()
    const requestingUserId = session?.user?.id ?? null

    const items = await getItemsByWishlist(id, requestingUserId)

    return Response.json(items, { status: 200 })
  } catch (error) {
    return handleServiceError(error)
  }
}

/**
 * POST /api/wishlists/[id]/items
 * Adds a new gift item to a wishlist. Requires auth and ownership.
 * Returns 201 with the created item.
 */
export async function POST(req, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'برای انجام این عمل باید وارد شوید.' }, { status: 401 })
    }

    const { id } = await params

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'درخواست نامعتبر است.' }, { status: 400 })
    }

    const { title, description, price, url, imageUrl, priority, notes, source } = body ?? {}

    const item = await addGiftItem(id, session.user.id, {
      title,
      description,
      price,
      url,
      imageUrl,
      priority,
      notes,
      source,
    })

    const responseBody = {
      id: item.id,
      wishlistId: item.wishlistId,
      title: item.title,
      description: item.description,
      price: item.price,
      url: item.url,
      imageUrl: item.imageUrl,
      priority: item.priority,
      notes: item.notes,
      source: item.source,
      isReserved: false,
      createdAt: item.createdAt,
    }

    return Response.json(responseBody, { status: 201 })
  } catch (error) {
    return handleServiceError(error)
  }
}