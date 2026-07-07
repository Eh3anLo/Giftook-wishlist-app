import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock user service
vi.mock('@/services/user.service.js', () => ({
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
}))

// Mock auth — server-side session retrieval
vi.mock('@/lib/auth.js', () => ({
  auth: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
}))

import { PATCH, DELETE } from '@/app/api/users/me/route.js'
import { updateUser, deleteUser } from '@/services/user.service.js'
import { auth, signOut } from '@/lib/auth.js'

// Helper to create a PATCH Request with a JSON body
function makePatchRequest(body) {
  return new Request('http://localhost/api/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Helper to create a DELETE Request
function makeDeleteRequest() {
  return new Request('http://localhost/api/users/me', {
    method: 'DELETE',
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// PATCH /api/users/me
// ---------------------------------------------------------------------------

describe('PATCH /api/users/me', () => {
  it('returns 200 with the updated user (no passwordHash) for valid { name }', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    updateUser.mockResolvedValue({ id: 'user-1', email: 'user@example.com', name: 'علی', image: null, createdAt: new Date(), updatedAt: new Date() })

    const req = makePatchRequest({ name: 'علی' })
    const res = await PATCH(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.name).toBe('علی')
    expect(body).not.toHaveProperty('passwordHash')
  })

  it('returns 401 when no session is present', async () => {
    auth.mockResolvedValue(null)

    const req = makePatchRequest({ name: 'علی' })
    const res = await PATCH(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBeTruthy()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('returns 401 when session has no user.id', async () => {
    auth.mockResolvedValue({ user: {} })

    const req = makePatchRequest({ name: 'علی' })
    const res = await PATCH(req)

    expect(res.status).toBe(401)
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('returns 400 with a Persian error when name is empty string', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })

    const req = makePatchRequest({ name: '' })
    const res = await PATCH(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('نام نمی‌تواند خالی باشد.')
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('returns 400 with a Persian error when name is whitespace-only', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })

    const req = makePatchRequest({ name: '   ' })
    const res = await PATCH(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('نام نمی‌تواند خالی باشد.')
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('calls updateUser with the correct userId and trimmed name', async () => {
    auth.mockResolvedValue({ user: { id: 'user-42' } })
    updateUser.mockResolvedValue({ id: 'user-42', email: 'u@test.com', name: 'رضا', image: null, createdAt: new Date(), updatedAt: new Date() })

    const req = makePatchRequest({ name: '  رضا  ' })
    await PATCH(req)

    expect(updateUser).toHaveBeenCalledWith('user-42', { name: 'رضا' })
  })

  it('never includes passwordHash in the 200 response even if service somehow returned it', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    updateUser.mockResolvedValue({
      id: 'user-1',
      email: 'x@x.com',
      name: 'کاربر',
      image: null,
      passwordHash: 'should-not-appear',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const req = makePatchRequest({ name: 'کاربر' })
    const res = await PATCH(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).not.toHaveProperty('passwordHash')
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/users/me
// ---------------------------------------------------------------------------

describe('DELETE /api/users/me', () => {
  it('returns 204 and calls deleteUser when authenticated', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    deleteUser.mockResolvedValue(undefined)

    const req = makeDeleteRequest()
    const res = await DELETE(req)

    expect(res.status).toBe(204)
    expect(deleteUser).toHaveBeenCalledWith('user-1')
  })

  it('returns 401 when no session is present', async () => {
    auth.mockResolvedValue(null)

    const req = makeDeleteRequest()
    const res = await DELETE(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBeTruthy()
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('returns 401 when session has no user.id', async () => {
    auth.mockResolvedValue({ user: {} })

    const req = makeDeleteRequest()
    const res = await DELETE(req)

    expect(res.status).toBe(401)
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('calls signOut after successfully deleting the user', async () => {
    auth.mockResolvedValue({ user: { id: 'user-99' } })
    deleteUser.mockResolvedValue(undefined)

    const req = makeDeleteRequest()
    await DELETE(req)

    expect(signOut).toHaveBeenCalled()
  })

  it('returns 204 with an empty body', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } })
    deleteUser.mockResolvedValue(undefined)

    const req = makeDeleteRequest()
    const res = await DELETE(req)

    expect(res.status).toBe(204)
    // 204 responses must not have a body
    const text = await res.text()
    expect(text).toBe('')
  })
})
