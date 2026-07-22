import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getUserById } from '@/services/user.service'
import ProfileForm from '@/components/profile/ProfileForm'

export const metadata = {
  title: 'ویرایش پروفایل',
}

export default async function EditProfilePage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await getUserById(session.user.id)

  if (!user) {
    redirect('/login')
  }

  const initialData = {
    name: user.name ?? '',
    image: user.image ?? '',
    email: user.email,
    bio: user.bio ?? '',
    birthMonth: user.birthMonth ?? '',
    birthDay: user.birthDay ?? '',
  }

  return (
    <div dir="rtl" className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">
        ویرایش پروفایل
      </h1>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <ProfileForm initialData={initialData} />
      </div>
    </div>
  )
}