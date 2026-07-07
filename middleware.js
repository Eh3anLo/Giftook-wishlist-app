import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config.js'
import { NextResponse } from 'next/server'

// Use the edge-compatible auth config (no Prisma adapter, no bcrypt)
const { auth } = NextAuth(authConfig)

export default auth(function middleware(req) {
  const isAuthenticated = !!req.auth
  const { pathname } = req.nextUrl

  const isAppRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/wishlists') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/genie') ||
    /^\/(app)\//.test(pathname)

  if (isAppRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', req.nextUrl.origin))
  }

  if (pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/(app)/:path*', '/login'],
}
