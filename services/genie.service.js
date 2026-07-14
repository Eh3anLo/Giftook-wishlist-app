import prisma from '@/lib/prisma.js'
import { validateGenieRequest } from '@/lib/validations.js'
import { ValidationError, ForbiddenError, TooManyRequestsError } from '@/lib/errors.js'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DAY_MS = 24 * 60 * 60 * 1000

// In-memory per-user rate limit. Resets on server restart — fine for a
// single-instance student project. Swap for a DB/Redis counter if you
// ever run multiple server instances.
const requestLog = new Map()

function checkRateLimit(userId) {
  const dailyLimit = Number(process.env.GENIE_DAILY_LIMIT) || 15
  const now = Date.now()
  const timestamps = (requestLog.get(userId) ?? []).filter((t) => now - t < DAY_MS)

  if (timestamps.length >= dailyLimit) {
    throw new TooManyRequestsError()
  }

  timestamps.push(now)
  requestLog.set(userId, timestamps)
}

/** Test-only helper — clears the in-memory rate limit between test cases. */
export function _resetGenieRateLimit() {
  requestLog.clear()
}

function buildPrompt({ description, budget, occasion }) {
  const constraints = []
  if (budget) constraints.push(`Budget: around $${budget} total; each item's price should fit within this.`)
  if (occasion) constraints.push(`Occasion: ${occasion}.`)

  const system = `You are Genie, a gift recommendation assistant embedded in a wishlist app called Giftook.
A user will describe someone they want to buy a gift for. Suggest exactly 6 diverse, realistic, purchasable gift ideas.

Respond with ONLY a raw JSON array, no markdown fences, no commentary, no keys other than these:
[
  {
    "title": string, max 100 characters, a specific product name (not a vague category),
    "description": string, max 220 characters, why it fits the recipient,
    "estimatedMinPrice": number, USD,
    "estimatedMaxPrice": number, USD, greater than or equal to estimatedMinPrice,
    "category": string, short (e.g. "Tech", "Books", "Home"),
    "searchQuery": string, a short search-engine query that would find this exact product
  }
]`

  const user = `Recipient description: ${description}
${constraints.join('\n')}
Return the JSON array now.`

  return { system, user }
}

function stripCodeFence(text) {
  return text
    .trim()
    .replace(/^```(json)?/i, '')
    .replace(/```$/, '')
    .trim()
}

/**
 * Cleans and bounds a single raw suggestion object from the model.
 * Returns null if the item is unusable (e.g. missing title).
 */
export function sanitizeSuggestion(raw) {
  if (!raw || typeof raw !== 'object') return null

  const title = String(raw.title ?? '').trim().slice(0, 100)
  if (!title) return null

  const description = String(raw.description ?? '').trim().slice(0, 220)
  const category = String(raw.category ?? '').trim().slice(0, 40) || null
  const searchQuery = String(raw.searchQuery ?? title).trim().slice(0, 150) || title

  let min = Number(raw.estimatedMinPrice)
  let max = Number(raw.estimatedMaxPrice)
  if (!Number.isFinite(min) || min < 0) min = null
  if (!Number.isFinite(max) || max < 0) max = null
  if (min !== null && max !== null && max < min) {
    ;[min, max] = [max, min]
  }

  return {
    title,
    description,
    category,
    estimatedMinPrice: min,
    estimatedMaxPrice: max,
    searchQuery,
    searchUrl: `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
  }
}

/**
 * Calls the configured OpenRouter model and returns a cleaned array of
 * gift suggestions. Throws a plain Error on any failure to parse —
 * caught as a 500 by handleServiceError.
 */
async function callGenieModel({ system, user }) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY تنظیم نشده است.')
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': 'Giftook Genie',
    },
    body: JSON.stringify({
      model: process.env.GENIE_MODEL || 'openrouter/free',
      temperature: 0.8,
      max_tokens: 900,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`OpenRouter request failed (${response.status}): ${body.slice(0, 300)}`)
  }

  const data = await response.json()
  // const raw = data?.choices?.[0]?.message?.content
  const raw = data?.choices?.[0]?.message?.reasoning_details[0].text
  console.log(data.choices[0].message)
  if (!raw) {
    console.error(raw)
    throw new Error('پاسخ نامعتبری از سرویس هوش مصنوعی دریافت شد.')
  }

  let parsed
  try {
    parsed = JSON.parse(stripCodeFence(raw))
  } catch {
    throw new Error('پاسخ هوش مصنوعی قابل تجزیه نبود.')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('ساختار پاسخ هوش مصنوعی نامعتبر است.')
  }

  const suggestions = parsed.map(sanitizeSuggestion).filter(Boolean)

  if (suggestions.length === 0) {
    throw new Error('هیچ پیشنهاد معتبری تولید نشد.')
  }

  return suggestions
}

/**
 * Generates gift ideas for the given wishlist owner.
 *
 * @param {string} wishlistId
 * @param {string} userId  Must own the wishlist.
 * @param {{ description: string, budget?: number, occasion?: string }} data
 * @returns {Promise<object[]>} Sanitized array of gift suggestions
 */
export async function generateGiftIdeas(wishlistId, userId, data) {
  const wishlist = await prisma.wishlist.findUnique({ where: { id: wishlistId } })

  if (!wishlist || wishlist.userId !== userId) {
    throw new ForbiddenError()
  }

  const validation = validateGenieRequest(data)
  if (!validation.valid) {
    throw new ValidationError(validation.error, validation.field)
  }

  checkRateLimit(userId)

  const prompt = buildPrompt(data)
  return callGenieModel(prompt)
}