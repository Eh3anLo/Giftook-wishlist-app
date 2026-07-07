"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

/**
 * Client Component — sign-out button that calls NextAuth signOut
 * and redirects the user to the home page.
 */
export default function SignOutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      خروج
    </Button>
  )
}
