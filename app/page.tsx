import Link from "next/link"
import { Button } from "@/components/ui/button"

/**
 * Landing page — shown to all visitors (authenticated or not).
 */
export default function Page() {
  return (
    <main
      dir="rtl"
      className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4 py-12"
    >
      {/* Hero section */}
      <div className="mx-auto max-w-xl text-center">
        {/* Brand */}
        <h1 className="mb-3 text-4xl font-bold text-primary sm:text-5xl">گیفتوک</h1>
        <p className="mb-2 text-lg font-medium text-foreground">
          لیست آرزوهای هدیه‌ات را بساز و با دوستانت به اشتراک بگذار
        </p>
        <p className="mb-8 text-sm text-muted-foreground">
          با گیفتوک آرزوهایت را مدیریت کن، لینک اشتراک‌گذاری بساز و بگذار دیگران بدانند چه
          هدیه‌ای می‌خواهی — بدون تکراری شدن خریدها.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/dashboard">ورود به داشبورد</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/login">ورود / ثبت‌نام</Link>
          </Button>
        </div>
      </div>

      {/* Feature highlights */}
      <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            title: "لیست آرزو بساز",
            desc: "آیتم‌های دلخواهت را با عنوان، قیمت، لینک و اولویت اضافه کن.",
          },
          {
            title: "به اشتراک بگذار",
            desc: "یک لینک منحصربه‌فرد برای لیستت بگیر و آن را با خانواده و دوستانت به اشتراک بگذار.",
          },
          {
            title: "رزرو هماهنگ",
            desc: "دوستانت هدایا را رزرو می‌کنند تا خرید تکراری نشود — بدون اینکه تو بدانی چه کسی چه می‌خرد.",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <h2 className="mb-1 font-semibold text-foreground">{feature.title}</h2>
            <p className="text-sm text-muted-foreground">{feature.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground">© ۱۴۰۴ گیفتوک</p>
    </main>
  )
}
