import prisma from '@/lib/prisma.js'
import { validateGenieRequest, validateGenieFollowUp } from '@/lib/validations.js'
import { ValidationError, ForbiddenError, TooManyRequestsError } from '@/lib/errors.js'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DAY_MS = 24 * 60 * 60 * 1000

// A conversation can grow by roughly 2 messages per follow-up turn
// (user + assistant), on top of the initial system + user + assistant.
// This caps it at about 6 follow-up turns before asking for a fresh session.
const MAX_CONVERSATION_MESSAGES = 14

// In-memory per-user rate limit. Resets on server restart — fine for a
// single-instance student project. Swap for a DB/Redis counter if you
// ever run multiple server instances.
const requestLog = new Map()

function getDailyLimit() {
  return Number(process.env.GENIE_DAILY_LIMIT) || 15
}

/** Returns this user's timestamps still inside the 24h window (no mutation). */
function getActiveTimestamps(userId) {
  const now = Date.now()
  return (requestLog.get(userId) ?? []).filter((t) => now - t < DAY_MS)
}

function checkRateLimit(userId) {
  const dailyLimit = getDailyLimit()
  const timestamps = getActiveTimestamps(userId)

  if (timestamps.length >= dailyLimit) {
    const resetAt = Math.min(...timestamps) + DAY_MS
    throw new TooManyRequestsError(undefined, resetAt)
  }

  timestamps.push(Date.now())
  requestLog.set(userId, timestamps)
}

/**
 * Returns a snapshot of the caller's Genie usage for today, WITHOUT
 * consuming a request. Used to show "X of Y requests left today" in the UI
 * before the user has generated anything yet.
 *
 * @param {string} userId
 * @returns {{ used: number, limit: number, remaining: number, resetAt: number|null }}
 *   resetAt is an epoch-ms timestamp for when the oldest counted request
 *   ages out of the 24h window (assuming no further requests are made).
 */
export function getGenieUsage(userId) {
  const dailyLimit = getDailyLimit()
  const timestamps = getActiveTimestamps(userId)
  const used = timestamps.length

  return {
    used,
    limit: dailyLimit,
    remaining: Math.max(dailyLimit - used, 0),
    resetAt: used > 0 ? Math.min(...timestamps) + DAY_MS : null,
  }
}

/** Test-only helper — clears the in-memory rate limit between test cases. */
export function _resetGenieRateLimit() {
  requestLog.clear()
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------
// Instructions are in English (models follow formatting rules more reliably
// in English), but every text field in the output must be Persian. Prices
// are in Iranian Toman (تومان), not Rial or USD.

const FEW_SHOT_EXAMPLE = `EXAMPLE (for a different recipient — for format only, do not reuse these ideas)
Input: "my sister, 24, loves hiking and coffee, budget around 1,500,000 Toman"
Output:
{
  "suggestions": [
    {"title": "فلاسک استیل استنلی مدل کوانچر", "description": "قهوه رو تا ساعت‌ها بعد از شروع کوهنوردی گرم نگه می‌داره.", "estimatedMinPrice": 900000, "estimatedMaxPrice": 1300000, "category": "کوهنوردی", "searchQuery": "فلاسک استیل استنلی کوانچر"},
    {"title": "قهوه‌ساز سفری ایرو پرس", "description": "دم‌کردن قهوه تازه حتی وسط طبیعت.", "estimatedMinPrice": 1100000, "estimatedMaxPrice": 1450000, "category": "کوهنوردی", "searchQuery": "قهوه ساز سفری ایرو پرس"},
    {"title": "جوراب کوهنوردی مرینو ووول (بسته دو عددی)", "description": "راحت و ضدعرق برای مسیرهای طولانی.", "estimatedMinPrice": 450000, "estimatedMaxPrice": 700000, "category": "پوشاک ورزشی", "searchQuery": "جوراب کوهنوردی مرینو ووول"},
    {"title": "کتاب مصور مسیرهای کوهنوردی مشهور جهان", "description": "کتاب جیبی برای الهام گرفتن از سفرهای بعدی.", "estimatedMinPrice": 600000, "estimatedMaxPrice": 950000, "category": "کتاب", "searchQuery": "کتاب مصور مسیرهای کوهنوردی"},
    {"title": "آسیاب دستی قهوه سفری", "description": "آسیاب کردن دانه قهوه تازه در طبیعت.", "estimatedMinPrice": 800000, "estimatedMaxPrice": 1200000, "category": "کوهنوردی", "searchQuery": "آسیاب دستی قهوه سفری"},
    {"title": "ست کیسه‌های سیلیکونی نگهداری خوراکی", "description": "جایگزین اقتصادی و قابل شست‌وشو برای پلاستیک یک‌بارمصرف.", "estimatedMinPrice": 350000, "estimatedMaxPrice": 550000, "category": "کوهنوردی", "searchQuery": "کیسه سیلیکونی نگهداری خوراکی"}
  ]
}`

function buildMessages({ description, budget, occasion }) {
  const constraints = []
  if (budget) {
    constraints.push(
      `- Budget: keep each suggestion's price near a total of ${budget} Toman (a bit under is fine, don't wildly exceed it).`
    )
  }
  if (occasion) constraints.push(`- Occasion: ${occasion}`)

  const system = `You are Genie, the gift-recommendation engine inside a wishlist app called Giftook.

TASK
Given a short description of a gift recipient, propose exactly 6 specific, realistic, purchasable gift ideas.
Do not think out loud, do not show your reasoning — respond directly with the final JSON object only.
The user may send follow-up messages after your first answer (e.g. asking for cheaper options, different
categories, or more of a certain type) — treat each follow-up as a request to revise your previous suggestions
while still following every rule below.

LANGUAGE — VERY IMPORTANT
The description you receive from the user may be in Persian or English. Regardless of the input language, every text field in your output ("title", "description", "category", "searchQuery") MUST be written in Persian (Farsi), not English. Brand names may stay in Latin script (e.g. "Stanley", "AeroPress"), but everything else — the product name itself, the description sentence, the category, and the search phrase — must be natural, fluent Persian.
For example, if a suggestion is a pen, write "title": "خودکار" — not "title": "pen" or "title": "Pen".

CURRENCY
"estimatedMinPrice" and "estimatedMaxPrice" are in Iranian Toman (the everyday currency unit in Iran) — not Rial, not USD. Use realistic, rounded values for the Iranian market (e.g. rounded to the nearest 10,000 Toman).

OUTPUT CONTRACT — READ CAREFULLY
Respond with ONE JSON object and NOTHING else, on every turn including follow-ups. No markdown code fences, no leading or trailing text, no comments, no trailing commas. The object must have this exact shape:

{
  "suggestions": [
    {
      "title": "Persian string, max 100 characters, a specific product name — not a vague category like 'a book'",
      "description": "Persian string, max 220 characters, one short sentence on why it fits this recipient",
      "estimatedMinPrice": 250000,
      "estimatedMaxPrice": 450000,
      "category": "short Persian string, one or two words, e.g. فناوری, کتاب, خانه, ورزشی",
      "searchQuery": "short Persian string — a phrase someone would type into an Iranian online store's search bar to find this exact product"
    }
  ]
}

RULES
1. "suggestions" must contain exactly 6 items, every turn, even after a follow-up.
2. estimatedMinPrice and estimatedMaxPrice are plain numbers (no "تومان", no commas, no strings, no ranges).
3. estimatedMaxPrice must be greater than or equal to estimatedMinPrice.
4. All 6 titles must be different products, not variations of the same item.
5. Use double quotes for every key and string value. No single quotes. No trailing commas.
6. Every "title", "description", "category", and "searchQuery" value must be Persian text, per the LANGUAGE rule above — this is checked, do not skip it.
7. Do not wrap the JSON in \`\`\`json or any other formatting. Output must start with { and end with }.

${FEW_SHOT_EXAMPLE}`

  const user = `Recipient description: ${description}
${constraints.join('\n')}
Return the JSON object now — remember, ONLY the JSON object, all text fields in Persian, nothing else.`

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}
// ai generated
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
 * Filters and bounds a conversation history array coming from the client,
 * so an arbitrary payload can't be smuggled into the model call.
 * @param {*} messages
 * @returns {Array<{role: string, content: string}>|null}
 */
function sanitizeIncomingConversation(messages) {
  if (!Array.isArray(messages)) return null

  const allowedRoles = ['system', 'user', 'assistant']
  const cleaned = messages
    .filter((m) => m && allowedRoles.includes(m.role) && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
    .slice(0, MAX_CONVERSATION_MESSAGES)

  return cleaned.length > 0 ? cleaned : null
}

/**
 * Cleans and bounds a single raw suggestion object from the model.
 * Returns null if the item is unusable (e.g. missing title).
 * Prices are treated as Iranian Toman.
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
    estimatedMinPrice: min, // Toman
    estimatedMaxPrice: max, // Toman
    searchQuery,
    searchUrl: `https://www.digikala.com/search/?q=${encodeURIComponent(searchQuery)}`,
    searchUrl2: `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
  }
}

// ---------------------------------------------------------------------------
// Model call
// ---------------------------------------------------------------------------

/**
 * Pulls the model's answer text out of an OpenRouter response.
 * Reasoning models sometimes leave `message.content` empty and put
 * everything in `message.reasoning` instead — check both.
 */
function extractContent(data) {
  const message = data?.choices?.[0]?.message
  if (!message) return null
  return message.content?.trim() || message.reasoning?.trim() || null
}

async function callOpenRouter(messages, { forceJsonMode, disableReasoning } = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY تنظیم نشده است.')
  }

  const body = {
    model: process.env.GENIE_MODEL || 'openrouter/free',
    temperature: 0.6,
    // Reasoning models spend part of this budget on internal "thinking"
    // before writing the answer — keep this generous so the JSON itself
    // doesn't get cut off.
    max_tokens: 2500,
    messages,
  }

  if (forceJsonMode) {
    body.response_format = { type: 'json_object' }
  }

  // Stops reasoning-capable models from burning the token budget on
  // chain-of-thought instead of the final JSON. Harmless no-op for
  // models that don't support "reasoning" at all.
  if (disableReasoning) {
    body.reasoning = { enabled: false }
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
    // Some free/light models reject the response_format or reasoning
    // param entirely. Retry once in the most minimal mode before giving up.
    if (forceJsonMode || disableReasoning) {
      return callOpenRouter(messages, { forceJsonMode: false, disableReasoning: false })
    }
    const errBody = await response.text().catch(() => '')
    throw new Error(`OpenRouter request failed (${response.status}): ${errBody.slice(0, 300)}`)
  }

  const data = await response.json()
  const content = extractContent(data)

  if (!content) {
    // Empty content, likely because a reasoning model used its whole
    // budget thinking. One automatic retry with reasoning forced off
    // and a fresh token budget, before we give up on this call entirely.
    if (!disableReasoning) {
      return callOpenRouter(messages, { forceJsonMode, disableReasoning: true })
    }
    throw new Error('پاسخ نامعتبری از سرویس هوش مصنوعی دریافت شد.')
  }

  return content
}

/**
 * Calls the configured OpenRouter model and returns a cleaned array of
 * gift suggestions plus the raw assistant text that produced them (so the
 * caller can append it to the conversation history for future turns).
 * Gives the model one repair attempt if its first response isn't valid
 * JSON matching the schema, before giving up.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<{ suggestions: object[], assistantContent: string }>}
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
  // syntax slightly. Give it one chance to fix its own output. This
  // repair round-trip is intentionally NOT kept in the conversation
  // history returned to the caller — only the final valid answer is.
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

    raw = await callOpenRouter(repairMessages, { forceJsonMode: true, disableReasoning: true })

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

  return { suggestions, assistantContent: raw }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates gift ideas for the given wishlist owner. Starts a new
 * conversation — use refineGiftIdeas for follow-up turns.
 *
 * @param {string} wishlistId
 * @param {string} userId  Must own the wishlist.
 * @param {{ description: string, budget?: number, occasion?: string }} data  budget is in Toman
 * @returns {Promise<{ suggestions: object[], conversationMessages: object[], usage: object }>}
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
  const { suggestions, assistantContent } = await callGenieModel(messages)

  return {
    suggestions,
    conversationMessages: [...messages, { role: 'assistant', content: assistantContent }],
    usage: getGenieUsage(userId),
  }
}

/**
 * Continues an existing Genie conversation with a follow-up message
 * (e.g. "ارزون‌تر پیشنهاد بده" / "چیز دیگه‌ای پیشنهاد بده"), reusing the
 * conversation history the client got back from the previous call.
 *
 * @param {string} wishlistId
 * @param {string} userId  Must own the wishlist.
 * @param {{ conversationMessages: object[], followUp: string }} params
 * @returns {Promise<{ suggestions: object[], conversationMessages: object[], usage: object }>}
 */
export async function refineGiftIdeas(wishlistId, userId, { conversationMessages, followUp }) {
  const wishlist = await prisma.wishlist.findUnique({ where: { id: wishlistId } })

  if (!wishlist || wishlist.userId !== userId) {
    throw new ForbiddenError()
  }

  const followUpValidation = validateGenieFollowUp({ followUp })
  if (!followUpValidation.valid) {
    throw new ValidationError(followUpValidation.error, followUpValidation.field)
  }

  const priorMessages = sanitizeIncomingConversation(conversationMessages)
  if (!priorMessages) {
    throw new ValidationError(
      'تاریخچه مکالمه نامعتبر است. یک درخواست جدید با Genie شروع کن.',
      'conversationMessages'
    )
  }

  if (priorMessages.length >= MAX_CONVERSATION_MESSAGES) {
    throw new ValidationError(
      'این مکالمه به سقف طول مجاز رسیده. یک درخواست جدید با Genie شروع کن.',
      'conversationMessages'
    )
  }

  checkRateLimit(userId)

  const messages = [
    ...priorMessages,
    {
      role: 'user',
      content: `${followUp}\nRemember: respond with ONLY the JSON object in the same schema as before, all text fields in Persian, exactly 6 suggestions.`,
    },
  ]

  const { suggestions, assistantContent } = await callGenieModel(messages)

  return {
    suggestions,
    conversationMessages: [...messages, { role: 'assistant', content: assistantContent }],
    usage: getGenieUsage(userId),
  }
}