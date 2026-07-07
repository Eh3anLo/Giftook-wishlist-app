import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/services/reservation.service.js', () => ({
  createReservation: vi.fn(),
  cancelReservation: vi.fn(),
}))

vi.mock('@/lib/auth.js', () => ({
  auth: vi.fn(),
}))

import { POST } from '@/app/api/reservations/route.js'
import { DELETE } from '@/app/api/reservations/[id]/route.js'
import { createReservation, cancelReservation } from '@/services/reservation.service.js'
import { auth } from '@/lib/auth.js'
import { ForbiddenError, NotFoundError, ConflictError } from '@/lib/errors.js'

function makeRequest(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  return new Request(url, opts)
}

function makeParams(id = 'res-1') {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// POST /api/reservations
// ---------------------------------------------------------------------------

describe('POST /api/reservations', () => {
  it('returns 401 with Persian error when there is no session', async () => {
    auth.mockResolvedValue(null)

    const req = makeRequest('POST', 'http://localhost/api/reservations', { giftItemId: 'gift-1' })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('برای رزرو کردن باید وارد شوید.')
    expect(createReservation).not.toHaveBeenCalled()
  })

  it('returns 400 with Persian error when giftItemId is missing', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })

    const req = makeRequest('POST', 'http://localhost/api/reservations', {})
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBeTruthy()
    expect(createReservation).not.toHaveBeenCalled()
  })

  it('returns 409 when service throws ConflictError for already reserved by someone else', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    createReservation.mockRejectedValue(
      new ConflictError('این هدیه قبلاً توسط شخص دیگری رزرو شده است.')
    )

    const req = makeRequest('POST', 'http://localhost/api/reservations', { giftItemId: 'gift-1' })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toBe('این هدیه قبلاً توسط شخص دیگری رزرو شده است.')
  })

  it('returns 409 when service throws ConflictError for already reserved by same user', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    createReservation.mockRejectedValue(
      new ConflictError('شما قبلاً این هدیه را رزرو کرده‌اید.')
    )

    const req = makeRequest('POST', 'http://localhost/api/reservations', { giftItemId: 'gift-1' })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toBe('شما قبلاً این هدیه را رزرو کرده‌اید.')
  })

  it('returns 403 when service throws ForbiddenError', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    createReservation.mockRejectedValue(new ForbiddenError())

    const req = makeRequest('POST', 'http://localhost/api/reservations', { giftItemId: 'gift-1' })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBeTruthy()
  })

  it('returns 201 with { id, giftItemId, createdAt } and no userId on success', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    createReservation.mockResolvedValue({
      id: 'res-1',
      giftItemId: 'gift-1',
      createdAt: new Date('2024-01-15T10:00:00Z'),
    })

    const req = makeRequest('POST', 'http://localhost/api/reservations', { giftItemId: 'gift-1' })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toHaveProperty('id', 'res-1')
    expect(body).toHaveProperty('giftItemId', 'gift-1')
    expect(body).toHaveProperty('createdAt')
    expect(body).not.toHaveProperty('userId')
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/reservations/[id]
// ---------------------------------------------------------------------------

describe('DELETE /api/reservations/[id]', () => {
  it('returns 401 when there is no session', async () => {
    auth.mockResolvedValue(null)

    const req = makeRequest('DELETE', 'http://localhost/api/reservations/res-1')
    const res = await DELETE(req, makeParams('res-1'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBeTruthy()
    expect(cancelReservation).not.toHaveBeenCalled()
  })

  it('returns 403 when service throws ForbiddenError', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    cancelReservation.mockRejectedValue(new ForbiddenError())

    const req = makeRequest('DELETE', 'http://localhost/api/reservations/res-1')
    const res = await DELETE(req, makeParams('res-1'))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBeTruthy()
  })

  it('returns 404 when service throws NotFoundError', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    cancelReservation.mockRejectedValue(new NotFoundError())

    const req = makeRequest('DELETE', 'http://localhost/api/reservations/nonexistent')
    const res = await DELETE(req, makeParams('nonexistent'))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBeTruthy()
  })

  it('returns 204 with no body on success', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    cancelReservation.mockResolvedValue(undefined)

    const req = makeRequest('DELETE', 'http://localhost/api/reservations/res-1')
    const res = await DELETE(req, makeParams('res-1'))

    expect(res.status).toBe(204)
    const text = await res.text()
    expect(text).toBe('')
  })
})
