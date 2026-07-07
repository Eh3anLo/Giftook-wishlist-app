import { Vazirmatn } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Providers from "@/app/providers"
import { cn } from "@/lib/utils"

const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazirmatn",
  display: "swap",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      suppressHydrationWarning
      className={cn("antialiased", vazirmatn.variable)}
    >
      <body className={cn("font-sans", vazirmatn.variable)}>
        <Providers>
          <ThemeProvider>{children}</ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
