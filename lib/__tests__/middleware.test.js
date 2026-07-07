import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    redirect: vi.fn((url) => ({ type: 'redirect', url: url.toString() })),
    next: vi.fn(() => ({ type: 'next' })),
  },
}))

// Mock auth — it wraps our middleware callback and calls it with the augmented req.
// We make auth() simply invoke the callback directly, passing the req unchanged.
vi.mock('@/lib/auth.js', () => ({
  auth: vi.fn((callback) => callback),
}))

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth.js'

// Import the middleware AFTER mocks are set up.
// middleware.js calls auth(fn) at the module level, so auth must be mocked first.
const middlewareModule = await import('@/middleware.js')
const middleware = middlewareModule.default

beforeEach(() => {
  vi.clearAllMocks()
})

/**
 * Creates a minimal mock NextRequest with the given pathname and optional session.
 */
function makeReq(pathname, session = null) {
  return {
    auth: session,
    nextUrl: {
      pathname,
      origin: 'http://localhost:3000',
    },
  }
}

describe('middleware', () => {
  it('redirects unauthenticated request to /(app)/dashboard to /login', () => {
    const req = makeReq('/dashboard', null)

    middleware(req)

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: expect.stringContaining('/login') })
    )
  })

  it('allows authenticated request to /(app)/dashboard through', () => {
    const req = makeReq('/dashboard', { user: { id: 'user-1' } })

    middleware(req)

    expect(NextResponse.next).toHaveBeenCalled()
    expect(NextResponse.redirect).not.toHaveBeenCalled()
  })

  it('redirects authenticated user visiting /login to /dashboard', () => {
    const req = makeReq('/login', { user: { id: 'user-1' } })

    middleware(req)

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: expect.stringContaining('/dashboard') })
    )
  })

  it('allows unauthenticated request to /login through', () => {
    const req = makeReq('/login', null)

    middleware(req)

    expect(NextResponse.next).toHaveBeenCalled()
    expect(NextResponse.redirect).not.toHaveBeenCalled()
  })

  it('allows unauthenticated request to /w/sometoken through', () => {
    const req = makeReq('/w/sometoken', null)

    middleware(req)

    expect(NextResponse.next).toHaveBeenCalled()
    expect(NextResponse.redirect).not.toHaveBeenCalled()
  })

  it('allows unauthenticated request to /u/userid through', () => {
    const req = makeReq('/u/userid-123', null)

    middleware(req)

    expect(NextResponse.next).toHaveBeenCalled()
    expect(NextResponse.redirect).not.toHaveBeenCalled()
  })

  it('allows unauthenticated request to / through', () => {
    const req = makeReq('/', null)

    middleware(req)

    expect(NextResponse.next).toHaveBeenCalled()
    expect(NextResponse.redirect).not.toHaveBeenCalled()
  })
})

describe('middleware config', () => {
  it('exports a matcher that covers (app) routes and /login', async () => {
    const { config } = middlewareModule
    expect(config.matcher).toContain('/(app)/:path*')
    expect(config.matcher).toContain('/login')
  })
})
