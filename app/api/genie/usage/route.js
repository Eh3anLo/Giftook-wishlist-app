import { auth } from '@/lib/auth.js'
import { getGenieUsage } from '@/services/genie.service.js'

/**
 * GET /api/genie/usage
 * Returns the current user's remaining Genie requests for today.
 * Does not consume a request — purely a read.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'برای انجام این عمل باید وارد شوید.' }, { status: 401 })
  }

  const usage = getGenieUsage(session.user.id)
  return Response.json(usage, { status: 200 })
}