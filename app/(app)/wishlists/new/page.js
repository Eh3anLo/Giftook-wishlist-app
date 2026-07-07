import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth.js'
import WishlistForm from '@/components/wishlist/WishlistForm'

/**
 * NewWishlistPage — Server Component shell.
 * Renders WishlistForm for creating a new wishlist.
 * On success the form redirects to the new wishlist's detail page.
 */
export const metadata = {
  title: 'لیست جدید',
}

export default async function NewWishlistPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  return (
    <div dir="rtl" className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-foreground">ایجاد لیست جدید</h1>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <WishlistForm />
      </div>
    </div>
  )
}
