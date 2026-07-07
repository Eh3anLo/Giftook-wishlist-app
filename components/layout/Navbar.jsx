import SignOutButton from "@/components/layout/SignOutButton"

/**
 * Server Component — top navigation bar.
 * RTL layout: brand logo on the right, user info + sign-out on the left.
 *
 * @param {{ session: import("next-auth").Session | null }} props
 */
export default function Navbar({ session }) {
  const user = session?.user

  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Left side (RTL) — user info + sign-out */}
      <div className="flex items-center gap-3">
        <SignOutButton />
        {user && (
          <div className="flex items-center gap-2">
            {/* Avatar */}
            <div className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground text-sm font-medium">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name ?? "کاربر"}
                  className="size-full object-cover"
                />
              ) : (
                <span>{(user.name ?? "ک").charAt(0)}</span>
              )}
            </div>
            {/* User name */}
            <span className="hidden text-sm font-medium sm:block">
              {user.name ?? "کاربر"}
            </span>
          </div>
        )}
      </div>

      {/* Right side (RTL) — brand logo */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-primary">گیفتوک</span>
      </div>
    </header>
  )
}
