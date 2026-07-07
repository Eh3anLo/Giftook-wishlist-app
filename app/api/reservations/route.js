import { auth } from '@/lib/auth.js'
import { createReservation } from '@/services/reservation.service.js'
import { handleServiceError } from '@/lib/api-helpers.js'

/**
 * POST /api/reservations
 * Creates a reservation for a gift item. Requires authentication.
 * Returns 201 with { id, giftItemId, createdAt } on success.
 */
export async function POST(req) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'برای رزرو کردن باید وارد شوید.' }, { status: 401 })
    }

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'درخواست نامعتبر است.' }, { status: 400 })
    }

    const { giftItemId } = body ?? {}

    if (!giftItemId) {
      return Response.json({ error: 'شناسه هدیه الزامی است.' }, { status: 400 })
    }

    const reservation = await createReservation(giftItemId, session.user.id)

    // Return only id, giftItemId, createdAt — never userId
    return Response.json(
      {
        id: reservation.id,
        giftItemId: reservation.giftItemId,
        createdAt: reservation.createdAt,
      },
      { status: 201 }
    )
  } catch (error) {
    return handleServiceError(error)
  }
}
