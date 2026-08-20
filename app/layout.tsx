import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MIA.VN — Kiểm kê tồn kho',
  description: 'Hệ thống kiểm kê tồn kho kho vận MIA.VN',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
