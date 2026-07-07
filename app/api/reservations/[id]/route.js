import { auth } from '@/lib/auth.js'
import { cancelReservation } from '@/services/reservation.service.js'
import { handleServiceError } from '@/lib/api-helpers.js'

/**
 * DELETE /api/reservations/[id]
 * Cancels (deletes) a reservation. Requires authentication.
 * Returns 204 with no body on success.
 */
export async function DELETE(req, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'برای انجام این عمل باید وارد شوید.' }, { status: 401 })
    }

    const { id } = await params

    await cancelReservation(id, session.user.id)

    return new Response(null, { status: 204 })
  } catch (error) {
    return handleServiceError(error)
  }
}
