import { auth } from '@/lib/auth.js'
import { generateGiftIdeas, refineGiftIdeas } from '@/services/genie.service.js'
import { handleServiceError } from '@/lib/api-helpers.js'

/**
 * POST /api/wishlists/[id]/genie
 *
 * New conversation:
 *   Body: { description: string, budget?: number, occasion?: string }
 *
 * Follow-up in an existing conversation:
 *   Body: { followUp: string, conversationMessages: object[] }
 *
 * Returns: { suggestions: object[], conversationMessages: object[] }
 * conversationMessages must be sent back unmodified on the next follow-up call.
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

    const { description, budget, occasion, followUp, conversationMessages } = body ?? {}

    const result = followUp
      ? await refineGiftIdeas(id, session.user.id, { conversationMessages, followUp })
      : await generateGiftIdeas(id, session.user.id, { description, budget, occasion })

    return Response.json(result, { status: 200 })
  } catch (error) {
    console.log(error)
    return handleServiceError(error)
  }
}