import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import RouteGuard from '@/components/auth/RouteGuard'
import { Toaster } from 'react-hot-toast'
import ArchBotWidget from '@/components/archbot/ArchBotWidget'
import ThemeProvider from '@/components/providers/ThemeProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#0B0F1A',
  colorScheme: 'dark',
}

export const metadata: Metadata = {
  title: 'ArchNext — Future City OS',
  description: 'AI-powered urban intelligence and real estate investment platform.',
  icons: {
    icon: '/branding/logo-icon.png',
    apple: '/branding/logo-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable} font-sans bg-[var(--background)] text-[var(--foreground)] antialiased selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden`}>
        {/* Dynamic background gradient mapped to theme colors later */}
        <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[var(--background)] to-[var(--background)] opacity-50 block dark:opacity-100 dark:via-[#0B0F1A] dark:to-[#0B0F1A]"></div>
        <ThemeProvider>
          <RouteGuard>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: 'var(--card)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }
              }}
            />
            <ArchBotWidget />
          </RouteGuard>
        </ThemeProvider>
      </body>
    </html>
  )
}
