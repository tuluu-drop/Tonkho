'use client'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useState } from 'react'

type NavItem = { href: string; label: string; short: string; icon: string }

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Cập nhật tồn kho', short: 'Cập nhật', icon: '📝' },
  { href: '/tra-cuu', label: 'Tra cứu sản phẩm', short: 'Tra cứu', icon: '🔍' },
  { href: '/history', label: 'Lịch sử', short: 'Lịch sử', icon: '🕑' },
]

export default function Shell({
  children, hoTen, isAdmin,
}: { children: React.ReactNode; hoTen: string; isAdmin: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const [openMobile, setOpenMobile] = useState(false)

  async function logout() {
    await createClient().auth.signOut()
    router.replace('/login')
  }

  const nav = [...NAV]
  if (isAdmin) nav.push({ href: '/admin', label: 'Quản trị', short: 'Quản trị', icon: '⚙️' })

  return (
    <div className="shell">
      {/* Sidebar desktop */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-brand">MIA.VN</div>
          <div className="sidebar-sub">Kiểm kê tồn kho</div>
        </div>
        <nav className="sidebar-nav">
          {nav.map(item => (
            <a key={item.href} href={item.href}
              className={`nav-link ${pathname === item.href ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-user">👤 {hoTen}</div>
          <button className="ghost sm" style={{ width: '100%' }} onClick={logout}>Đăng xuất</button>
        </div>
      </aside>

      {/* Header mobile */}
      <header className="mobile-header">
        <div className="sidebar-brand" style={{ fontSize: 18 }}>MIA.VN</div>
        <button className="ghost sm" onClick={logout}>Đăng xuất</button>
      </header>

      {/* Nội dung */}
      <main className="content">{children}</main>

      {/* Bottom nav mobile */}
      <nav className="bottom-nav">
        {nav.map(item => (
          <a key={item.href} href={item.href}
            className={`bottom-link ${pathname === item.href ? 'active' : ''}`}>
            <span className="bottom-icon">{item.icon}</span>
            <span className="bottom-label">{item.short}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
