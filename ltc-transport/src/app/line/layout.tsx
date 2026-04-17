import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: '長照交通 · 駕駛',
  description: '長照交通服務平台 駕駛端',
  // Open Graph for LINE share preview
  openGraph: {
    title: '長照交通服務平台',
    description: '駕駛任務管理',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#16a34a',
}

export default function LineLayout({ children }: { children: React.ReactNode }) {
  return (
    // Full-height mobile shell — works in LINE's WebView
    // overflow-x-hidden prevents horizontal scroll on narrow screens
    // w-full max-w-lg ensures fluid layout on phones narrower than 512px
    <div className="min-h-screen bg-gray-50 flex flex-col w-full max-w-lg mx-auto relative overflow-x-hidden">
      {children}
    </div>
  )
}
