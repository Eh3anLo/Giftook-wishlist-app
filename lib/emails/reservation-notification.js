/**
 * Builds the email sent to a wishlist owner when one of their gift items
 * gets reserved.
 *
 * @param {{
 *   wishlistTitle: string,
 *   itemTitle: string,
 *   wishlistUrl: string,
 *   reserverName: string|null,  // null when identity should stay hidden
 * }} params
 * @returns {{ subject: string, html: string, text: string }}
 */
export function buildReservationNotificationEmail({
  wishlistTitle,
  itemTitle,
  wishlistUrl,
  reserverName,
}) {
  const subject = `🎁 یکی از آیتم‌های «${wishlistTitle}» رزرو شد`

  const whoLine = reserverName
    ? `<strong>${escapeHtml(reserverName)}</strong> این هدیه را رزرو کرده است.`
    : `یکی از افراد این هدیه را رزرو کرده است. هویت رزروکننده برای حفظ غافلگیری نمایش داده نمی‌شود.`

  const html = `
  <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
    <h2 style="margin: 0 0 12px;">خبر خوب! 🎁</h2>
    <p style="margin: 0 0 16px; line-height: 1.8;">
      آیتم «<strong>${escapeHtml(itemTitle)}</strong>» از لیست آرزوهای «${escapeHtml(wishlistTitle)}» شما رزرو شد.
    </p>
    <p style="margin: 0 0 20px; line-height: 1.8; color: #4b5563;">${whoLine}</p>
    <a href="${wishlistUrl}" style="display: inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px;">
      مشاهده لیست آرزوها
    </a>
    <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">این ایمیل به‌صورت خودکار از طرف Giftook ارسال شده است.</p>
  </div>`

  const text = `آیتم "${itemTitle}" از لیست آرزوهای "${wishlistTitle}" شما رزرو شد. ${
    reserverName ? `رزروکننده: ${reserverName}` : 'هویت رزروکننده نمایش داده نمی‌شود.'
  }\nمشاهده: ${wishlistUrl}`

  return { subject, html, text }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}