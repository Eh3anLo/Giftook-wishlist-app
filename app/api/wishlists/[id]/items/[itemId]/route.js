import { auth } from '@/lib/auth.js'
import { updateGiftItem, deleteGiftItem } from '@/services/gift.service.js'
import { handleServiceError } from '@/lib/api-helpers.js'

/**
 * PATCH /api/wishlists/[id]/items/[itemId]
 * Partially updates a gift item. Requires auth and ownership.
 */
export async function PATCH(req, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'برای انجام این عمل باید وارد شوید.' }, { status: 401 })
    }

    const { itemId } = await params

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'درخواست نامعتبر است.' }, { status: 400 })
    }

    const { title, description, price, url, imageUrl, priority, notes } = body ?? {}

    const updated = await updateGiftItem(itemId, session.user.id, {
      title,
      description,
      price,
      url,
      imageUrl,
      priority,
      notes,
    })

    return Response.json(updated, { status: 200 })
  } catch (error) {
    return handleServiceError(error)
  }
}

/**
 * DELETE /api/wishlists/[id]/items/[itemId]
 * Deletes a gift item. Requires auth and ownership.
 * Returns 204 No Content on success.
 */
export async function DELETE(req, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'برای انجام این عمل باید وارد شوید.' }, { status: 401 })
    }

    const { itemId } = await params

    await deleteGiftItem(itemId, session.user.id)

    return new Response(null, { status: 204 })
  } catch (error) {
    return handleServiceError(error)
  }
}
