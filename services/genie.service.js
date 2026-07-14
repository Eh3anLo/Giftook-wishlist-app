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

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

const FEW_SHOT_EXAMPLE = `EXAMPLE (for a different recipient — for format only, do not reuse these ideas)
Input: "my sister, 24, loves hiking and coffee, budget around $50"
Output:
{
  "suggestions": [
    {"title": "Stanley Quencher Insulated Tumbler", "description": "Keeps coffee hot on early trail starts.", "estimatedMinPrice": 30, "estimatedMaxPrice": 45, "category": "Outdoors", "searchQuery": "Stanley Quencher insulated tumbler"},
    {"title": "AeroPress Go Travel Coffee Maker", "description": "Compact coffee brewing for camping trips.", "estimatedMinPrice": 35, "estimatedMaxPrice": 40, "category": "Outdoors", "searchQuery": "AeroPress Go travel coffee maker"},
    {"title": "Merino Wool Hiking Socks (2-pack)", "description": "Comfortable, moisture-wicking socks for long hikes.", "estimatedMinPrice": 20, "estimatedMaxPrice": 30, "category": "Outdoors", "searchQuery": "merino wool hiking socks 2 pack"},
    {"title": "Trail Map Coffee Table Book", "description": "A coffee-table book of famous hiking trails worldwide.", "estimatedMinPrice": 25, "estimatedMaxPrice": 35, "category": "Books", "searchQuery": "hiking trails coffee table book"},
    {"title": "Compact Camping Coffee Grinder", "description": "Hand grinder for fresh coffee on the trail.", "estimatedMinPrice": 25, "estimatedMaxPrice": 45, "category": "Outdoors", "searchQuery": "compact hand coffee grinder camping"},
    {"title": "Reusable Silicone Snack Bags Set", "description": "Practical, eco-friendly trail-snack storage.", "estimatedMinPrice": 15, "estimatedMaxPrice": 25, "category": "Outdoors", "searchQuery": "reusable silicone snack bags set"}
  ]
}`

function buildMessages({ description, budget, occasion }) {
  const constraints = []
  if (budget) {
    constraints.push(
      `- Budget: keep each item's estimated price near $${budget} total (a bit under is fine, don't wildly exceed it).`
    )
  }
  if (occasion) constraints.push(`- Occasion: ${occasion}.`)

  const system = `You are Genie, the gift-recommendation engine inside a wishlist app called Giftook.

TASK
Given a short description of a gift recipient, propose exactly 6 specific, realistic, purchasable gift ideas.

OUTPUT CONTRACT — READ CAREFULLY
Respond with ONE JSON object and NOTHING else. No markdown code fences, no leading or trailing text, no comments, no trailing commas. The object must have this exact shape:

{
  "suggestions": [
    {
      "title": "string, max 100 characters, a specific product name — not a vague category like 'a book'",
      "description": "string, max 220 characters, one short sentence on why it fits this recipient",
      "estimatedMinPrice": 25,
      "estimatedMaxPrice": 45,
      "category": "string, one or two words, e.g. Tech, Books, Home, Outdoors",
      "searchQuery": "string, a short phrase someone would type into a shopping search engine to find this exact product"
    }
  ]
}

RULES
1. "suggestions" must contain exactly 6 items.
2. estimatedMinPrice and estimatedMaxPrice are plain numbers (no "$", no commas, no ranges as strings).
3. estimatedMaxPrice must be greater than or equal to estimatedMinPrice.
4. All 6 titles must be different products, not variations of the same item.
5. Use double quotes for every key and string value. No single quotes. No trailing commas.
6. Do not wrap the JSON in \`\`\`json or any other formatting. Output must start with { and end with }.

${FEW_SHOT_EXAMPLE}`

  const user = `Recipient description: ${description}
${constraints.join('\n')}
Return the JSON object now — remember, ONLY the JSON object, nothing else.`

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

function stripCodeFence(text) {
  return text
    .trim()
    .replace(/^```(json)?/i, '')
    .replace(/```$/, '')
    .trim()
}

function extractSuggestionsArray(parsed) {
  if (Array.isArray(parsed)) return parsed
  if (parsed && Array.isArray(parsed.suggestions)) return parsed.suggestions
  return null
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

// ---------------------------------------------------------------------------
// Model call
// ---------------------------------------------------------------------------

async function callOpenRouter(messages, { forceJsonMode } = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY تنظیم نشده است.')
  }

  const body = {
    model: process.env.GENIE_MODEL || 'openrouter/free',
    temperature: 0.6,
    max_tokens: 1200,
    messages,
  }

  if (forceJsonMode) {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': 'Giftook Genie',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    // Some free/light models reject the response_format param entirely.
    // Retry once in plain mode before giving up.
    if (forceJsonMode && response.status === 400) {
      return callOpenRouter(messages, { forceJsonMode: false })
    }
    const errBody = await response.text().catch(() => '')
    throw new Error(`OpenRouter request failed (${response.status}): ${errBody.slice(0, 300)}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('پاسخ نامعتبری از سرویس هوش مصنوعی دریافت شد.')
  }

  return content
}

/**
 * Calls the configured OpenRouter model and returns a cleaned array of
 * gift suggestions. Gives the model one repair attempt if its first
 * response isn't valid JSON matching the schema, before giving up.
 */
async function callGenieModel(messages) {
  let raw = await callOpenRouter(messages, { forceJsonMode: true })

  let parsed
  try {
    parsed = JSON.parse(stripCodeFence(raw))
  } catch {
    parsed = null
  }

  let suggestionsArray = parsed ? extractSuggestionsArray(parsed) : null

  // Repair pass: lighter models sometimes wrap JSON in prose or break
  // syntax slightly. Give it one chance to fix its own output.
  if (!suggestionsArray) {
    const repairMessages = [
      ...messages,
      { role: 'assistant', content: raw },
      {
        role: 'user',
        content:
          'That response was not valid JSON matching the required schema. Reply again with ONLY the corrected JSON object — no explanation, no markdown fences.',
      },
    ]

    raw = await callOpenRouter(repairMessages, { forceJsonMode: true })

    try {
      parsed = JSON.parse(stripCodeFence(raw))
      suggestionsArray = extractSuggestionsArray(parsed)
    } catch {
      throw new Error('پاسخ هوش مصنوعی حتی پس از تلاش دوم قابل تجزیه نبود.')
    }
  }

  if (!suggestionsArray) {
    throw new Error('ساختار پاسخ هوش مصنوعی نامعتبر است.')
  }

  const suggestions = suggestionsArray.map(sanitizeSuggestion).filter(Boolean)

  if (suggestions.length === 0) {
    throw new Error('هیچ پیشنهاد معتبری تولید نشد.')
  }

  return suggestions
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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

  const messages = buildMessages(data)
  return callGenieModel(messages)
}