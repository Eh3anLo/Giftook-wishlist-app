"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"

/**
 * Login page — supports Google OAuth and email/password credentials.
 * All text in Persian. RTL layout inherited from root <html>.
 */
export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState("login") // 'login' | 'register'
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    const error = searchParams.get("error")

    if (error) {
      router.replace(`/error?error=${error}`)
    }
  }, [searchParams, router])

  async function handleCredentials(e) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (tab === "register") {
        // Register first
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? "خطا در ثبت‌نام.")
          return
        }
      }

      // Sign in with credentials
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("ایمیل یا رمز عبور اشتباه است.")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      setError("خطا در ارتباط با سرور.")
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError("")
    await signIn("google", { callbackUrl: "/dashboard" })
  }

  return (
    <main
      dir="rtl"
      className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12"
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-primary">
            گیفتوک
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === "login" ? "به حساب خود وارد شوید" : "حساب جدید بسازید"}
          </p>
        </div>

        {/* Tab switch */}
        <div className="mb-6 flex rounded-lg border border-border bg-muted p-1">
          <button
            type="button"
            onClick={() => {
              setTab("login")
              setError("")
            }}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              tab === "login"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ورود
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register")
              setError("")
            }}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              tab === "register"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ثبت‌نام
          </button>
        </div>

        {/* Google button */}
        <button
          type="button"
          onClick={handleGoogle}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          ادامه با گوگل
        </button>

        {/* Divider */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">یا</span>
          </div>
        </div>

        {/* Credentials form */}
        <form onSubmit={handleCredentials} className="space-y-4" noValidate>
          {tab === "register" && (
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                نام نمایشی
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="علی رضایی"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              ایمیل
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              رمز عبور
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === "register" ? "حداقل ۸ کاراکتر" : "••••••••"}
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            />
          </div>

          {/* Error message */}
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none disabled:opacity-60"
          >
            {loading
              ? "در حال پردازش..."
              : tab === "login"
                ? "ورود"
                : "ثبت‌نام"}
          </button>
        </form>
      </div>
    </main>
  )
}
