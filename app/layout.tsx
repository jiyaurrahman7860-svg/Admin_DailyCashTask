import './globals.css'
import { AdminDarkModeProvider } from '@/contexts/AdminDarkModeContext'

export const metadata = {
  title: 'DailyCashTask Admin',
  description: 'Admin panel for DailyCashTask',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AdminDarkModeProvider>
          {children}
        </AdminDarkModeProvider>
      </body>
    </html>
  )
}
