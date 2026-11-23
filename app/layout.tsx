import type { Metadata, Viewport } from "next"
import { Atkinson_Hyperlegible_Next, Jersey_10 } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"

const jersey = Jersey_10({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  variable: "--font-jersey",
  display: "swap",
})

// Texto: diseñada para máxima legibilidad (I/l/1 y O/0 bien distintas).
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin", "latin-ext"],
  variable: "--font-text",
  display: "swap",
})

export const metadata: Metadata = {
  title: { default: "Hogar", template: "%s | Hogar" },
  description: "Tareas, compras y gastos de tu hogar compartido.",
  applicationName: "Hogar",
  appleWebApp: { capable: true, title: "Hogar", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32" }, { url: "/sprites/icono.svg", type: "image/svg+xml" }],
    apple: "/icons/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7cc8f8" },
    { media: "(prefers-color-scheme: dark)", color: "#1a2350" },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" suppressHydrationWarning className={`${jersey.variable} ${atkinson.variable}`}>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
