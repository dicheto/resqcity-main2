import type { Metadata } from 'next'
import { Fraunces, Manrope } from 'next/font/google'
import { SiteLayout } from '@/components/SiteLayout'
import { CustomCursor } from '@/components/CustomCursor'
import { LenisProvider } from '@/components/LenisProvider'
import Script from 'next/script'
import './globals.css'

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display' })
const manrope = Manrope({ subsets: ['latin', 'cyrillic'], variable: '--font-body' })

export const metadata: Metadata = {
  title: {
    default: 'ResQCity - Платформа за управление на градски проблеми',
    template: '%s | ResQCity'
  },
  description: 'Докладвайте и управлявайте градски проблеми в реално време. Интерактивна карта, автоматично насочване към органите и проследяване на статуса.',
  keywords: ['градски проблеми', 'сигнали', 'Благоевград', 'управление', 'карта', 'докладване', 'комунални услуги', 'ResQCity'],
  authors: [{ name: 'ResQCity Team' }],
  creator: 'ResQCity',
  publisher: 'ResQCity',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://resq.tcom-sf.org'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'bg_BG',
    url: '/',
    title: 'ResQCity - Платформа за управление на градски проблеми',
    description: 'Докладвайте и управлявайте градски проблеми в реално време. Интерактивна карта, автоматично насочване към органите и проследяване на статуса.',
    siteName: 'ResQCity',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'ResQCity - Управление на градски проблеми',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ResQCity - Платформа за управление на градски проблеми',
    description: 'Докладвайте и управлявайте градски проблеми в реално време.',
    images: ['/og-image.svg'],
    creator: '@resqcity',
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code-here', // Замени с реалния код от Search Console
  },
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
  themeColor: '#FF6B35',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="bg" className="dark" suppressHydrationWarning>
      <head>
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `}
        </Script>
        {/* Structured Data */}
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "ResQCity",
              "description": "Платформа за докладване и управление на градски проблеми",
              "url": process.env.NEXT_PUBLIC_APP_URL || "https://resq.tcom-sf.org",
              "publisher": {
                "@type": "Organization",
                "name": "ResQCity",
                "url": process.env.NEXT_PUBLIC_APP_URL || "https://resq.tcom-sf.org"
              }
            })
          }}
        />
      </head>
      <body className={`${fraunces.variable} ${manrope.variable} font-sans`}>
        <LenisProvider>
          <CustomCursor />
          <SiteLayout>{children}</SiteLayout>
        </LenisProvider>
      </body>
    </html>
  )
}
