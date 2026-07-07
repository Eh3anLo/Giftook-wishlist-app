import Link from 'next/link'

/**
 * Auth error page — shown when NextAuth encounters an OAuth or session error.
 * All text in Persian.
 */
export default async function AuthErrorPage({ searchParams }) {
  const params = await searchParams
  const error = params.error

  const messages = {
    OAuthSignin: 'خطا در شروع فرآیند ورود با گوگل.',
    OAuthCallback: 'خطا در دریافت پاسخ از گوگل.',
    OAuthCreateAccount: 'خطا در ایجاد حساب کاربری.',
    EmailCreateAccount: 'خطا در ایجاد حساب ایمیل.',
    Callback: 'خطا در فرآیند ورود.',
    OAuthAccountNotLinked: 'این ایمیل قبلاً با روش دیگری ثبت شده است.',
    SessionRequired: 'برای دسترسی به این صفحه باید وارد شوید.',
    Default: 'خطایی در فرآیند ورود رخ داده است.',
  }

  const message = messages[error] ?? messages.Default

  return (
    <main
      dir="rtl"
      className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12"
    >
      <div className="w-full max-w-sm text-center">
        <div className="mb-4 text-4xl">⚠️</div>
        <h1 className="mb-2 text-xl font-semibold text-foreground">خطا در ورود</h1>
        <p className="mb-6 text-sm text-muted-foreground">{message}</p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          بازگشت به صفحه ورود
        </Link>
      </div>
    </main>
  )
}
