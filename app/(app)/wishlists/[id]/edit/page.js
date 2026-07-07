import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth.js'
import { getWishlistById } from '@/services/wishlist.service.js'
import WishlistForm from '@/components/wishlist/WishlistForm'

/**
 * EditWishlistPage — Server Component shell.
 * Fetches existing wishlist data and pre-populates WishlistForm.
 * Only the owner can access this page.
 * On success the form redirects to the wishlist's detail page.
 */
export async function generateMetadata({ params }) {
  const { id } = await params
  const session = await auth()
  const wishlist = await getWishlistById(id, session?.user?.id ?? null).catch(() => null)
  return { title: wishlist ? `ویرایش: ${wishlist.title}` : 'ویرایش لیست' }
}

export default async function EditWishlistPage({ params }) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  let wishlist
  try {
    wishlist = await getWishlistById(id, session.user.id)
  } catch {
    notFound()
  }

  if (!wishlist) {
    notFound()
  }

  // Only the owner may edit
  if (wishlist.userId !== session.user.id) {
    redirect(`/wishlists/${id}`)
  }

  // Strip items before passing to the form — only wishlist metadata is needed
  const initialData = {
    title: wishlist.title,
    description: wishlist.description ?? '',
    occasion: wishlist.occasion ?? '',
    visibility: wishlist.visibility,
    coverImage: wishlist.coverImage ?? '',
    showReserverIdentity: wishlist.showReserverIdentity,
  }

  return (
    <div dir="rtl" className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-foreground">ویرایش لیست</h1>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <WishlistForm initialData={initialData} wishlistId={id} />
      </div>
    </div>
  )
}
