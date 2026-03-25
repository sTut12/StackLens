import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'StackLens - AI Website Reverse Engineer',
  description: 'Paste any URL. StackLens reveals exactly how it was built.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#F5F5F0] text-[#111111] min-h-screen antialiased">
        <div className="noise-overlay" />
        <div id="scroll-progress" style={{ width: '0%' }} />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}