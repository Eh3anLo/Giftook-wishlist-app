import { auth } from '@/lib/auth.js'
import { archiveWishlist, unarchiveWishlist } from '@/services/wishlist.service.js'
import { handleServiceError } from '@/lib/api-helpers.js'

/**
 * PATCH /api/wishlists/[id]/archive
 * Body: { archived: boolean }
 * Archives or unarchives a wishlist. Requires auth and ownership.
 * Does not affect the wishlist's public share link — archiving only
 * hides it from the owner's default dashboard view.
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

    const { archived } = body ?? {}

    if (typeof archived !== 'boolean') {
      return Response.json({ error: 'مقدار archived باید true یا false باشد.' }, { status: 400 })
    }

    const updated = archived
      ? await archiveWishlist(id, session.user.id)
      : await unarchiveWishlist(id, session.user.id)

    return Response.json(updated, { status: 200 })
  } catch (error) {
    return handleServiceError(error)
  }
}