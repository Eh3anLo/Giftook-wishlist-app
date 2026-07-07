import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock wishlist service
vi.mock('@/services/wishlist.service.js', () => ({
  getWishlistsByUser: vi.fn(),
  createWishlist: vi.fn(),
  getWishlistById: vi.fn(),
  updateWishlist: vi.fn(),
  deleteWishlist: vi.fn(),
}))

// Mock auth — server-side session retrieval
vi.mock('@/lib/auth.js', () => ({
  auth: vi.fn(),
}))

import { GET as getWishlists, POST as postWishlist } from '@/app/api/wishlists/route.js'
import {
  GET as getWishlistById,
  PATCH as patchWishlist,
  DELETE as deleteWishlist,
} from '@/app/api/wishlists/[id]/route.js'
import {
  getWishlistsByUser,
  createWishlist,
  getWishlistById as getWishlistByIdService,
  updateWishlist,
  deleteWishlist as deleteWishlistService,
} from '@/services/wishlist.service.js'
import { auth } from '@/lib/auth.js'
import { ForbiddenError } from '@/lib/errors.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  return new Request(url, opts)
}

/** Minimal params object that mimics Next.js dynamic route params */
function makeParams(id = 'wishlist-1') {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// GET /api/wishlists
// ---------------------------------------------------------------------------

describe('GET /api/wishlists', () => {
  it('returns 401 when there is no session', async () => {
    auth.mockResolvedValue(null)

    const req = makeRequest('GET', 'http://localhost/api/wishlists')
    const res = await getWishlists(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBeTruthy()
    expect(getWishlistsByUser).not.toHaveBeenCalled()
  })

  it('returns 200 with { wishlists, total } when authenticated', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    getWishlistsByUser.mockResolvedValue({
      wishlists: [{ id: 'w1', title: 'تولدم' }],
      total: 1,
    })

    const req = makeRequest('GET', 'http://localhost/api/wishlists')
    const res = await getWishlists(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveProperty('wishlists')
    expect(body).toHaveProperty('total')
    expect(Array.isArray(body.wishlists)).toBe(true)
  })

  it('passes page and pageSize query params to getWishlistsByUser', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    getWishlistsByUser.mockResolvedValue({ wishlists: [], total: 0 })

    const req = makeRequest('GET', 'http://localhost/api/wishlists?page=2&pageSize=5')
    await getWishlists(req)

    expect(getWishlistsByUser).toHaveBeenCalledWith('user-1', { page: 2, pageSize: 5 })
  })
})

// ---------------------------------------------------------------------------
// POST /api/wishlists
// ---------------------------------------------------------------------------

describe('POST /api/wishlists', () => {
  it('returns 401 when there is no session', async () => {
    auth.mockResolvedValue(null)

    const req = makeRequest('POST', 'http://localhost/api/wishlists', { title: 'تولدم' })
    const res = await postWishlist(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBeTruthy()
    expect(createWishlist).not.toHaveBeenCalled()
  })

  it('returns 201 with the correct shape for a valid body', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    createWishlist.mockResolvedValue({
      id: 'clxyz123',
      title: 'تولدم',
      description: null,
      occasion: 'birthday',
      visibility: 'link_only',
      coverImage: null,
      shareToken: 'V1StGXR8_Z5jdHi6B-myT',
      showReserverIdentity: false,
      createdAt: new Date('2024-01-15T10:30:00Z'),
    })

    const req = makeRequest('POST', 'http://localhost/api/wishlists', {
      title: 'تولدم',
      occasion: 'birthday',
      visibility: 'link_only',
    })
    const res = await postWishlist(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toHaveProperty('id', 'clxyz123')
    expect(body).toHaveProperty('title', 'تولدم')
    expect(body).toHaveProperty('shareToken', 'V1StGXR8_Z5jdHi6B-myT')
    expect(body).toHaveProperty('shareUrl', '/w/V1StGXR8_Z5jdHi6B-myT')
    expect(body).toHaveProperty('itemCount', 0)
    expect(body).toHaveProperty('reservedCount', 0)
  })

  it('never includes passwordHash in the 201 response', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    createWishlist.mockResolvedValue({
      id: 'w1',
      title: 'هدیه',
      description: null,
      occasion: null,
      visibility: 'private',
      coverImage: null,
      shareToken: 'abc123',
      showReserverIdentity: false,
      createdAt: new Date(),
      passwordHash: 'should-never-appear',
    })

    const req = makeRequest('POST', 'http://localhost/api/wishlists', { title: 'هدیه' })
    const res = await postWishlist(req)
    const body = await res.json()

    expect(body).not.toHaveProperty('passwordHash')
  })

  it('returns 400 with Persian error and field "title" when title is empty', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    // createWishlist throws ValidationError for empty title
    const { ValidationError } = await import('@/lib/errors.js')
    createWishlist.mockRejectedValue(
      new ValidationError(
        'عنوان لیست آرزوها الزامی است و نباید بیش از ۱۰۰ کاراکتر باشد.',
        'title'
      )
    )

    const req = makeRequest('POST', 'http://localhost/api/wishlists', { title: '' })
    const res = await postWishlist(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBeTruthy()
    expect(body.field).toBe('title')
  })

  it('returns 400 with field "description" when description is over 500 chars', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    const { ValidationError } = await import('@/lib/errors.js')
    createWishlist.mockRejectedValue(
      new ValidationError('توضیحات نباید بیش از ۵۰۰ کاراکتر باشد.', 'description')
    )

    const req = makeRequest('POST', 'http://localhost/api/wishlists', {
      title: 'تولد',
      description: 'x'.repeat(501),
    })
    const res = await postWishlist(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.field).toBe('description')
  })

  it('returns 400 when visibility value is invalid', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    const { ValidationError } = await import('@/lib/errors.js')
    createWishlist.mockRejectedValue(
      new ValidationError('مقدار نمایش‌پذیری معتبر نیست.', 'visibility')
    )

    const req = makeRequest('POST', 'http://localhost/api/wishlists', {
      title: 'تولد',
      visibility: 'invalid_value',
    })
    const res = await postWishlist(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.field).toBe('visibility')
  })
})

// ---------------------------------------------------------------------------
// GET /api/wishlists/[id]
// ---------------------------------------------------------------------------

describe('GET /api/wishlists/[id]', () => {
  it('returns 403 when service throws ForbiddenError', async () => {
    auth.mockResolvedValue(null)
    getWishlistByIdService.mockRejectedValue(new ForbiddenError())

    const req = makeRequest('GET', 'http://localhost/api/wishlists/wishlist-1')
    const res = await getWishlistById(req, makeParams('wishlist-1'))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBeTruthy()
  })

  it('returns 200 with the wishlist when found', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    getWishlistByIdService.mockResolvedValue({
      id: 'wishlist-1',
      title: 'تولدم',
      visibility: 'public',
      items: [],
    })

    const req = makeRequest('GET', 'http://localhost/api/wishlists/wishlist-1')
    const res = await getWishlistById(req, makeParams('wishlist-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveProperty('id', 'wishlist-1')
  })

  it('returns 404 when wishlist is not found', async () => {
    auth.mockResolvedValue(null)
    getWishlistByIdService.mockResolvedValue(null)

    const req = makeRequest('GET', 'http://localhost/api/wishlists/nonexistent')
    const res = await getWishlistById(req, makeParams('nonexistent'))

    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/wishlists/[id]
// ---------------------------------------------------------------------------

describe('PATCH /api/wishlists/[id]', () => {
  it('returns 401 when there is no session', async () => {
    auth.mockResolvedValue(null)

    const req = makeRequest('PATCH', 'http://localhost/api/wishlists/wishlist-1', {
      title: 'عنوان جدید',
    })
    const res = await patchWishlist(req, makeParams('wishlist-1'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBeTruthy()
    expect(updateWishlist).not.toHaveBeenCalled()
  })

  it('returns 403 when service throws ForbiddenError', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    updateWishlist.mockRejectedValue(new ForbiddenError())

    const req = makeRequest('PATCH', 'http://localhost/api/wishlists/wishlist-1', {
      title: 'عنوان جدید',
    })
    const res = await patchWishlist(req, makeParams('wishlist-1'))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBeTruthy()
  })

  it('returns 200 with the updated wishlist for a valid partial body', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    updateWishlist.mockResolvedValue({
      id: 'wishlist-1',
      title: 'عنوان جدید',
      description: 'توضیح',
      occasion: null,
      visibility: 'public',
      coverImage: null,
      shareToken: 'tok123',
      showReserverIdentity: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const req = makeRequest('PATCH', 'http://localhost/api/wishlists/wishlist-1', {
      title: 'عنوان جدید',
    })
    const res = await patchWishlist(req, makeParams('wishlist-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveProperty('title', 'عنوان جدید')
    expect(body).not.toHaveProperty('passwordHash')
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/wishlists/[id]
// ---------------------------------------------------------------------------

describe('DELETE /api/wishlists/[id]', () => {
  it('returns 401 when there is no session', async () => {
    auth.mockResolvedValue(null)

    const req = makeRequest('DELETE', 'http://localhost/api/wishlists/wishlist-1')
    const res = await deleteWishlist(req, makeParams('wishlist-1'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBeTruthy()
    expect(deleteWishlistService).not.toHaveBeenCalled()
  })

  it('returns 403 when service throws ForbiddenError', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    deleteWishlistService.mockRejectedValue(new ForbiddenError())

    const req = makeRequest('DELETE', 'http://localhost/api/wishlists/wishlist-1')
    const res = await deleteWishlist(req, makeParams('wishlist-1'))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBeTruthy()
  })

  it('returns 204 with no body on success', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    deleteWishlistService.mockResolvedValue(undefined)

    const req = makeRequest('DELETE', 'http://localhost/api/wishlists/wishlist-1')
    const res = await deleteWishlist(req, makeParams('wishlist-1'))

    expect(res.status).toBe(204)
    const text = await res.text()
    expect(text).toBe('')
  })
})
