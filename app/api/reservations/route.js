import { auth } from '@/lib/auth.js'
import {
  createReservation,
  ownerReserveGift,
} from '@/services/reservation.service.js'
import { handleServiceError } from '@/lib/api-helpers.js'
import { CACHE_ONE_YEAR_SECONDS } from 'next/dist/lib/constants'

/**
 * POST /api/reservations
 *
 * User:
 *  - reserves a gift for themselves.
 *
 * Wishlist owner:
 *  - reserves for themselves.
 *  - reserves for another person.
 */
export async function POST(req) {
  
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return Response.json(
        { error: 'برای رزرو کردن باید وارد شوید.' },
        { status: 401 }
      )
    }
    
    let body
    
    try {
      body = await req.json()
    } catch {
      return Response.json(
        { error: 'درخواست نامعتبر است.' },
        { status: 400 }
      )
    }
    
    const {
      giftItemId,
      ownerReservation = false,
      reserveForSelf = true,
      guestName,
      guestEmail,
      guestPhone,
      message,
    } = body ?? {}
    console.log(body)
    
    if (!giftItemId) {
      return Response.json(
        { error: 'شناسه هدیه الزامی است.' },
        { status: 400 }
      )
    }

    if (
      ownerReservation &&
      !reserveForSelf &&
      (!guestName || guestName.trim() === '')
    ) {
      return Response.json(
        {
          error: 'نام شخص رزروکننده الزامی است.',
        },
        {
          status: 400,
        }
      )
    }
    let reservation

    if (ownerReservation) {
      // ownerReserveGift خودش بررسی می‌کند که
      // session.user.id واقعاً مالک لیست باشد.
      reservation = await ownerReserveGift(
        giftItemId,
        session.user.id,
        {
          reserveForSelf,
          guestName: guestName?.trim(),
          guestEmail: guestEmail?.trim() || null,
          guestPhone: guestPhone?.trim() || null,
          message: message?.trim() || null,
        }
      )
    } else {
      reservation = await createReservation(
        giftItemId,
        session.user.id,
        {
          message: message?.trim() || null,
        }
      )
      console.log(reservation)

    }
    return Response.json(
      {
        id: reservation.id,
        giftItemId: reservation.giftItemId,
        createdAt: reservation.createdAt,
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(error)
    return handleServiceError(error)
  }
}