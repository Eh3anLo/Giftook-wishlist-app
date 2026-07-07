import bcrypt from 'bcryptjs'
import { validateRegistration } from '@/lib/validations.js'
import { getUserByEmail, createUser } from '@/services/user.service.js'
import { handleServiceError } from '@/lib/api-helpers.js'

/**
 * POST /api/auth/register
 * Registers a new email/password user.
 */
export async function POST(req) {
  try {
    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'درخواست نامعتبر است.' }, { status: 400 })
    }

    const { email, password, name } = body ?? {}

    // Validate input fields
    const validation = validateRegistration({ email, password, name })
    if (!validation.valid) {
      return Response.json(
        { error: validation.error, field: validation.field },
        { status: 400 }
      )
    }

    // Check for existing user with the same email
    const existingUser = await getUserByEmail(email.trim())
    if (existingUser) {
      return Response.json(
        { error: 'این ایمیل قبلاً ثبت شده است.' },
        { status: 409 }
      )
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create the user — never include passwordHash in the response
    await createUser({ email: email.trim(), name: name?.trim() ?? null, passwordHash })

    return Response.json({ success: true }, { status: 201 })
  } catch (error) {
    return handleServiceError(error)
  }
}
