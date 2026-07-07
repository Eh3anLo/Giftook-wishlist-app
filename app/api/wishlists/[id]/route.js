import { auth } from '@/lib/auth.js'
import { getWishlistById, updateWishlist, deleteWishlist } from '@/services/wishlist.service.js'
import { handleServiceError } from '@/lib/api-helpers.js'

/**
 * GET /api/wishlists/[id]
 * Returns a wishlist by ID.
 * Auth is optional — private wishlists require ownership.
 */
export async function GET(req, { params }) {
  try {
    const { id } = await params
    const session = await auth()
    const requestingUserId = session?.user?.id ?? null

    const wishlist = await getWishlistById(id, requestingUserId)

    if (!wishlist) {
      return Response.json({ error: 'مورد درخواستی یافت نشد.' }, { status: 404 })
    }

    return Response.json(wishlist, { status: 200 })
  } catch (error) {
    return handleServiceError(error)
  }
}

/**
 * PATCH /api/wishlists/[id]
 * Partially updates a wishlist. Requires auth and ownership.
 */
export async function PATCH(req, { params }) {
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

    const { title, description, coverImage, occasion, visibility, showReserverIdentity } =
      body ?? {}

    const updated = await updateWishlist(id, session.user.id, {
      title,
      description,
      coverImage,
      occasion,
      visibility,
      showReserverIdentity,
    })

    return Response.json(updated, { status: 200 })
  } catch (error) {
    return handleServiceError(error)
  }
}

/**
 * DELETE /api/wishlists/[id]
 * Deletes a wishlist. Requires auth and ownership.
 * Returns 204 No Content on success.
 */
export async function DELETE(req, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'برای انجام این عمل باید وارد شوید.' }, { status: 401 })
    }

    const { id } = await params

    await deleteWishlist(id, session.user.id)

    return new Response(null, { status: 204 })
  } catch (error) {
    return handleServiceError(error)
  }
}
