import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GEUWAT Admin',
  description: 'Admin Dashboard for GEUWAT',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
