import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Web3Provider } from "@/components/providers/web3-provider"
import { AuthProvider } from "@/components/providers/auth-provider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: "Rialo | Decentralized Exchange",
  description: "Trade with confidence on Rialo DEX - Protocol-level 2FA security on Solana Devnet",
  generator: "v0.app",
  keywords: ["DEX", "decentralized exchange", "crypto", "trading", "Solana", "Devnet", "Web3", "Rialo"],
  authors: [{ name: "Rialo" }],
  icons: {
    icon: [
      {
        url: "/rialo.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/rialo.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/rialo.png",
        type: "image/svg+xml",
      },
    ],
    apple: "/rialo.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#010101",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`} suppressHydrationWarning>
        <Web3Provider>
          <AuthProvider>{children}</AuthProvider>
        </Web3Provider>
        <Analytics />
      </body>
    </html>
  )
}
