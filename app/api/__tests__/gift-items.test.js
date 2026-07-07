import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock gift service
vi.mock('@/services/gift.service.js', () => ({
  getItemsByWishlist: vi.fn(),
  addGiftItem: vi.fn(),
  updateGiftItem: vi.fn(),
  deleteGiftItem: vi.fn(),
}))

// Mock auth — server-side session retrieval
vi.mock('@/lib/auth.js', () => ({
  auth: vi.fn(),
}))

import { GET as getItems, POST as postItem } from '@/app/api/wishlists/[id]/items/route.js'
import {
  PATCH as patchItem,
  DELETE as deleteItem,
} from '@/app/api/wishlists/[id]/items/[itemId]/route.js'
import {
  getItemsByWishlist,
  addGiftItem,
  updateGiftItem,
  deleteGiftItem,
} from '@/services/gift.service.js'
import { auth } from '@/lib/auth.js'
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  return new Request(url, opts)
}

/** Mimics Next.js dynamic route params with both id and itemId */
function makeParams(id = 'wishlist-1', itemId = 'item-1') {
  return { params: Promise.resolve({ id, itemId }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// GET /api/wishlists/[id]/items
// ---------------------------------------------------------------------------

describe('GET /api/wishlists/[id]/items', () => {
  it('returns items list even without auth (auth is optional)', async () => {
    auth.mockResolvedValue(null)
    getItemsByWishlist.mockResolvedValue([
      { id: 'item-1', title: 'هدفون سونی', isReserved: false },
      { id: 'item-2', title: 'کتاب', isReserved: true },
    ])

    const req = makeRequest('GET', 'http://localhost/api/wishlists/wishlist-1/items')
    const res = await getItems(req, makeParams('wishlist-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(2)
    expect(getItemsByWishlist).toHaveBeenCalledWith('wishlist-1', null)
  })

  it('returns 403 when service throws ForbiddenError', async () => {
    auth.mockResolvedValue(null)
    getItemsByWishlist.mockRejectedValue(new ForbiddenError())

    const req = makeRequest('GET', 'http://localhost/api/wishlists/wishlist-1/items')
    const res = await getItems(req, makeParams('wishlist-1'))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// POST /api/wishlists/[id]/items
// ---------------------------------------------------------------------------

describe('POST /api/wishlists/[id]/items', () => {
  it('returns 401 when there is no session', async () => {
    auth.mockResolvedValue(null)

    const req = makeRequest('POST', 'http://localhost/api/wishlists/wishlist-1/items', {
      title: 'هدفون',
    })
    const res = await postItem(req, makeParams('wishlist-1'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBeTruthy()
    expect(addGiftItem).not.toHaveBeenCalled()
  })

  it('returns 201 with full gift item shape including isReserved: false', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    addGiftItem.mockResolvedValue({
      id: 'clitem456',
      wishlistId: 'clxyz123',
      title: 'هدفون سونی WH-1000XM5',
      description: 'هدفون بی‌سیم با کیفیت عالی',
      price: '12500000.00',
      url: 'https://example.com/headphones',
      imageUrl: 'https://example.com/headphones.jpg',
      priority: 'high',
      notes: 'رنگ مشکی ترجیح داده می‌شود',
      createdAt: new Date('2024-01-15T10:35:00Z'),
    })

    const req = makeRequest('POST', 'http://localhost/api/wishlists/clxyz123/items', {
      title: 'هدفون سونی WH-1000XM5',
      description: 'هدفون بی‌سیم با کیفیت عالی',
      price: 12500000,
      url: 'https://example.com/headphones',
      imageUrl: 'https://example.com/headphones.jpg',
      priority: 'high',
      notes: 'رنگ مشکی ترجیح داده می‌شود',
    })
    const res = await postItem(req, makeParams('clxyz123'))
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toHaveProperty('id', 'clitem456')
    expect(body).toHaveProperty('wishlistId', 'clxyz123')
    expect(body).toHaveProperty('title', 'هدفون سونی WH-1000XM5')
    expect(body).toHaveProperty('price', '12500000.00')
    expect(body).toHaveProperty('url', 'https://example.com/headphones')
    expect(body).toHaveProperty('imageUrl', 'https://example.com/headphones.jpg')
    expect(body).toHaveProperty('priority', 'high')
    expect(body).toHaveProperty('isReserved', false)
    expect(body).toHaveProperty('createdAt')
  })

  it('returns 400 with Persian error and field "title" when title is missing', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    addGiftItem.mockRejectedValue(
      new ValidationError('عنوان هدیه الزامی است و نباید بیش از ۱۵۰ کاراکتر باشد.', 'title')
    )

    const req = makeRequest('POST', 'http://localhost/api/wishlists/wishlist-1/items', {})
    const res = await postItem(req, makeParams('wishlist-1'))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBeTruthy()
    expect(body.field).toBe('title')
  })

  it('returns 400 with field "title" when title is over 150 chars', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    addGiftItem.mockRejectedValue(
      new ValidationError('عنوان هدیه الزامی است و نباید بیش از ۱۵۰ کاراکتر باشد.', 'title')
    )

    const req = makeRequest('POST', 'http://localhost/api/wishlists/wishlist-1/items', {
      title: 'ه'.repeat(151),
    })
    const res = await postItem(req, makeParams('wishlist-1'))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.field).toBe('title')
  })

  it('returns 400 with field "price" when price is negative', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    addGiftItem.mockRejectedValue(
      new ValidationError(
        'قیمت باید عددی مثبت با حداکثر دو رقم اعشار و در محدوده مجاز باشد.',
        'price'
      )
    )

    const req = makeRequest('POST', 'http://localhost/api/wishlists/wishlist-1/items', {
      title: 'هدیه',
      price: -100,
    })
    const res = await postItem(req, makeParams('wishlist-1'))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.field).toBe('price')
  })

  it('returns 400 with field "url" when URL format is invalid', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    addGiftItem.mockRejectedValue(
      new ValidationError('آدرس لینک باید با http:// یا https:// شروع شود.', 'url')
    )

    const req = makeRequest('POST', 'http://localhost/api/wishlists/wishlist-1/items', {
      title: 'هدیه',
      url: 'ftp://invalid.com',
    })
    const res = await postItem(req, makeParams('wishlist-1'))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.field).toBe('url')
  })

  it('returns 403 when service throws ForbiddenError (non-owner)', async () => {
    auth.mockResolvedValue({ user: { id: 'user-2' } })
    addGiftItem.mockRejectedValue(new ForbiddenError())

    const req = makeRequest('POST', 'http://localhost/api/wishlists/wishlist-1/items', {
      title: 'هدیه',
    })
    const res = await postItem(req, makeParams('wishlist-1'))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/wishlists/[id]/items/[itemId]
// ---------------------------------------------------------------------------

describe('PATCH /api/wishlists/[id]/items/[itemId]', () => {
  it('returns 401 when there is no session', async () => {
    auth.mockResolvedValue(null)

    const req = makeRequest(
      'PATCH',
      'http://localhost/api/wishlists/wishlist-1/items/item-1',
      { title: 'عنوان جدید' }
    )
    const res = await patchItem(req, makeParams('wishlist-1', 'item-1'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBeTruthy()
    expect(updateGiftItem).not.toHaveBeenCalled()
  })

  it('returns 403 when service throws ForbiddenError', async () => {
    auth.mockResolvedValue({ user: { id: 'user-2' } })
    updateGiftItem.mockRejectedValue(new ForbiddenError())

    const req = makeRequest(
      'PATCH',
      'http://localhost/api/wishlists/wishlist-1/items/item-1',
      { title: 'عنوان جدید' }
    )
    const res = await patchItem(req, makeParams('wishlist-1', 'item-1'))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBeTruthy()
  })

  it('returns 404 when service throws NotFoundError', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    updateGiftItem.mockRejectedValue(new NotFoundError())

    const req = makeRequest(
      'PATCH',
      'http://localhost/api/wishlists/wishlist-1/items/nonexistent',
      { title: 'عنوان جدید' }
    )
    const res = await patchItem(req, makeParams('wishlist-1', 'nonexistent'))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBeTruthy()
  })

  it('returns 200 with updated item for a valid partial body', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    updateGiftItem.mockResolvedValue({
      id: 'item-1',
      wishlistId: 'wishlist-1',
      title: 'عنوان جدید',
      description: null,
      price: null,
      url: null,
      imageUrl: null,
      priority: 'medium',
      notes: null,
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-16T08:00:00Z'),
    })

    const req = makeRequest(
      'PATCH',
      'http://localhost/api/wishlists/wishlist-1/items/item-1',
      { title: 'عنوان جدید', priority: 'medium' }
    )
    const res = await patchItem(req, makeParams('wishlist-1', 'item-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveProperty('id', 'item-1')
    expect(body).toHaveProperty('title', 'عنوان جدید')
    expect(body).toHaveProperty('priority', 'medium')
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/wishlists/[id]/items/[itemId]
// ---------------------------------------------------------------------------

describe('DELETE /api/wishlists/[id]/items/[itemId]', () => {
  it('returns 401 when there is no session', async () => {
    auth.mockResolvedValue(null)

    const req = makeRequest('DELETE', 'http://localhost/api/wishlists/wishlist-1/items/item-1')
    const res = await deleteItem(req, makeParams('wishlist-1', 'item-1'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBeTruthy()
    expect(deleteGiftItem).not.toHaveBeenCalled()
  })

  it('returns 403 when service throws ForbiddenError', async () => {
    auth.mockResolvedValue({ user: { id: 'user-2' } })
    deleteGiftItem.mockRejectedValue(new ForbiddenError())

    const req = makeRequest('DELETE', 'http://localhost/api/wishlists/wishlist-1/items/item-1')
    const res = await deleteItem(req, makeParams('wishlist-1', 'item-1'))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBeTruthy()
  })

  it('returns 204 with no body on success', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    deleteGiftItem.mockResolvedValue(undefined)

    const req = makeRequest('DELETE', 'http://localhost/api/wishlists/wishlist-1/items/item-1')
    const res = await deleteItem(req, makeParams('wishlist-1', 'item-1'))

    expect(res.status).toBe(204)
    const text = await res.text()
    expect(text).toBe('')
  })
})
