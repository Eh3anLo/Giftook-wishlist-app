import { auth } from '@/lib/auth.js'
import { cancelReservation, updateReservationProof } from '@/services/reservation.service.js'
import { handleServiceError } from '@/lib/api-helpers.js'

/**
 * PATCH /api/reservations/[id]
 * Adds or updates purchase-proof details on a reservation
 * (receiptImageUrl, shippingAddress, trackingCode). Only the person who
 * made the reservation may call this — the service layer enforces that.
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

    const { receiptImageUrl, shippingAddress, trackingCode } = body ?? {}

    const updated = await updateReservationProof(id, session.user.id, {
      receiptImageUrl,
      shippingAddress,
      trackingCode,
    })

    return Response.json(updated, { status: 200 })
  } catch (error) {
    return handleServiceError(error)
  }
}

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