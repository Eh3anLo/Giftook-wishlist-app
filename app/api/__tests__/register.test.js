import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/services/user.service.js', () => ({
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed_password') },
}))

import { POST } from '@/app/api/auth/register/route.js'
import { getUserByEmail, createUser } from '@/services/user.service.js'
import bcrypt from 'bcryptjs'

/**
 * Helper to create a Request object with a JSON body.
 */
function makeRequest(body) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/auth/register', () => {
  it('returns 201 { success: true } for a valid new user', async () => {
    getUserByEmail.mockResolvedValue(null)
    createUser.mockResolvedValue({ id: 'new-user-1', email: 'test@example.com', name: 'Ali' })

    const req = makeRequest({ email: 'test@example.com', password: 'securepass', name: 'Ali' })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toEqual({ success: true })
  })

  it('returns 409 with Persian message for a duplicate email', async () => {
    getUserByEmail.mockResolvedValue({ id: 'existing-user', email: 'dup@example.com' })

    const req = makeRequest({ email: 'dup@example.com', password: 'securepass' })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toBe('این ایمیل قبلاً ثبت شده است.')
  })

  it('returns 400 with field "password" when password is shorter than 8 characters', async () => {
    const req = makeRequest({ email: 'user@example.com', password: 'short' })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.field).toBe('password')
  })

  it('returns 400 when email is missing', async () => {
    const req = makeRequest({ password: 'securepass123' })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.field).toBe('email')
  })

  it('returns 400 when email is invalid format', async () => {
    const req = makeRequest({ email: 'not-an-email', password: 'securepass' })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.field).toBe('email')
  })

  it('never includes passwordHash in the 201 response', async () => {
    getUserByEmail.mockResolvedValue(null)
    createUser.mockResolvedValue({ id: 'u1', email: 'x@example.com', name: null })

    const req = makeRequest({ email: 'x@example.com', password: 'password123' })
    const res = await POST(req)
    const body = await res.json()

    expect(body).not.toHaveProperty('passwordHash')
  })

  it('never includes passwordHash in the 409 response', async () => {
    getUserByEmail.mockResolvedValue({ id: 'u1', email: 'dup@example.com', passwordHash: 'hash' })

    const req = makeRequest({ email: 'dup@example.com', password: 'password123' })
    const res = await POST(req)
    const body = await res.json()

    expect(body).not.toHaveProperty('passwordHash')
  })

  it('hashes the password with bcrypt before creating the user', async () => {
    getUserByEmail.mockResolvedValue(null)
    createUser.mockResolvedValue({ id: 'u2', email: 'new@example.com', name: null })

    const req = makeRequest({ email: 'new@example.com', password: 'mypassword' })
    await POST(req)

    expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 12)
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: 'hashed_password' })
    )
  })

  it('does not call createUser when validation fails', async () => {
    const req = makeRequest({ email: 'bad', password: 'short' })
    await POST(req)

    expect(createUser).not.toHaveBeenCalled()
  })

  it('does not call createUser when email already exists', async () => {
    getUserByEmail.mockResolvedValue({ id: 'existing', email: 'dup@example.com' })

    const req = makeRequest({ email: 'dup@example.com', password: 'validpassword' })
    await POST(req)

    expect(createUser).not.toHaveBeenCalled()
  })
})
