import { sendMail } from '@/lib/mailer.js'
import { buildReservationNotificationEmail } from '@/lib/emails/reservation-notification.js'
import { getUserById } from '@/services/user.service.js'

/**
 * Notifies a wishlist owner by email that one of their gift items was
 * reserved. Respects the wishlist's showReserverIdentity setting — the
 * reserver's name is only included when that flag is on, exactly like
 * the rest of the app already treats reserver identity.
 *
 * Never throws — a failed or misconfigured email must not break the
 * reservation flow that triggered it.
 *
 * @param {{
 *   ownerEmail: string|null,
 *   showReserverIdentity: boolean,
 *   wishlistTitle: string,
 *   wishlistShareToken: string,
 *   itemTitle: string,
 *   reservation: { userId?: string|null, guestName?: string|null },
 * }} params
 * @returns {Promise<void>}
 */
export async function notifyReservationCreated({
  ownerEmail,
  showReserverIdentity,
  wishlistTitle,
  wishlistShareToken,
  itemTitle,
  reservation,
}) {
  if (!ownerEmail) return

  try {
    let reserverName = null

    if (showReserverIdentity) {
      if (reservation.userId) {
        const reserver = await getUserById(reservation.userId)
        reserverName = reserver?.name ?? 'یک کاربر'
      } else if (reservation.guestName) {
        reserverName = reservation.guestName
      }
    }

    const wishlistUrl = `${process.env.APP_URL || 'http://localhost:3000'}/w/${wishlistShareToken}`

    const { subject, html, text } = buildReservationNotificationEmail({
      wishlistTitle,
      itemTitle,
      wishlistUrl,
      reserverName,
    })

    await sendMail({ to: ownerEmail, subject, html, text })
  } catch (error) {
    console.error('ارسال اعلان رزرو با خطا مواجه شد:', error?.message ?? error)
  }
}