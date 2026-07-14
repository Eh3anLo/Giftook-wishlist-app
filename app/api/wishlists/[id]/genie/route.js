import { auth } from '@/lib/auth.js'
import { generateGiftIdeas } from '@/services/genie.service.js'
import { handleServiceError } from '@/lib/api-helpers.js'

/**
 * POST /api/wishlists/[id]/genie
 * Generates AI gift suggestions for the wishlist owner. Requires auth + ownership.
 * Body: { description: string, budget?: number, occasion?: string }
 * Returns: { suggestions: object[] }
 */
export async function POST(req, { params }) {
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

    const { description, budget, occasion } = body ?? {}

    const suggestions = await generateGiftIdeas(id, session.user.id, {
      description,
      budget,
      occasion,
    })

    return Response.json({ suggestions }, { status: 200 })
  } catch (error) {
    console.error(error)
    return handleServiceError(error)
  }
}