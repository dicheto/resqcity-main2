import type { Metadata } from 'next'
import { Fraunces, Manrope } from 'next/font/google'
import { SiteLayout } from '@/components/SiteLayout'
import './globals.css'

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display' })
const manrope = Manrope({ subsets: ['latin', 'cyrillic'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'ResQCity - Urban Management Platform',
  description: 'Report and manage urban issues in your city',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ResQCity',
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: '#FF6B35',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="bg" className="dark" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${manrope.variable} font-sans`}>
        <SiteLayout>{children}</SiteLayout>
      </body>
    </html>
  )
}
