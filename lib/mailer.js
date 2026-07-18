import nodemailer from 'nodemailer'

let transporter = null

function getTransporter() {
  if (transporter) return transporter

  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    throw new Error('GMAIL_USER یا GMAIL_APP_PASSWORD تنظیم نشده است.')
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })

  return transporter
}

/**
 * Sends an email. Never throws — logs and resolves to false on failure,
 * so a broken mail config never breaks the calling request (e.g. a
 * reservation should still succeed even if the notification email fails).
 *
 * @param {{ to: string, subject: string, html: string, text?: string }} options
 * @returns {Promise<boolean>} true if sent successfully
 */
export async function sendMail({ to, subject, html, text }) {
  try {
    const transport = getTransporter()
    await transport.sendMail({
      from: `"Giftook" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      text: text ?? undefined,
    })
    return true
  } catch (error) {
    console.error('ارسال ایمیل ناموفق بود:', error?.message ?? error)
    return false
  }
}