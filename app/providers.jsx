"use client"

import { SessionProvider } from "next-auth/react"

/**
 * Thin client wrapper that makes the NextAuth session available
 * to all Client Components in the tree.
 * The root layout stays a Server Component by delegating the
 * SessionProvider here.
 */
export default function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>
}
