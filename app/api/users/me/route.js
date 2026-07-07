import { auth, signOut } from '@/lib/auth.js'
import { updateUser, deleteUser } from '@/services/user.service.js'
import { handleServiceError } from '@/lib/api-helpers.js'

/**
 * PATCH /api/users/me
 * Updates the authenticated user's name and/or avatar URL.
 * Never returns passwordHash.
 */
export async function PATCH(req) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'برای ادامه باید وارد شوید.' }, { status: 401 })
    }

    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'درخواست نامعتبر است.' }, { status: 400 })
    }

    const { name, image } = body ?? {}

    // Validate: if name is provided it must not be empty or whitespace-only
    if (name !== undefined && String(name).trim() === '') {
      return Response.json({ error: 'نام نمی‌تواند خالی باشد.', field: 'name' }, { status: 400 })
    }

    const updated = await updateUser(session.user.id, {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(image !== undefined ? { image } : {}),
    })

    // Strip passwordHash just in case (updateUser already omits it, but be defensive)
    const { passwordHash: _pw, ...safeUser } = updated ?? {}
    return Response.json(safeUser, { status: 200 })
  } catch (error) {
    return handleServiceError(error)
  }
}

/**
 * DELETE /api/users/me
 * Atomically deletes the authenticated user's account and invalidates the session.
 * Returns 204 No Content on success.
 */
export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'برای ادامه باید وارد شوید.' }, { status: 401 })
    }

    await deleteUser(session.user.id)

    // Invalidate the NextAuth session server-side
    await signOut({ redirect: false })

    return new Response(null, { status: 204 })
  } catch (error) {
    return handleServiceError(error)
  }
}
