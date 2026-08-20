'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function TopBar({ hoTen, isAdmin }: { hoTen: string; isAdmin: boolean }) {
  const router = useRouter()
  async function logout() {
    await createClient().auth.signOut()
    router.replace('/login')
  }
  return (
    <div className="topbar">
      <div className="brand">MIA.VN · Kiểm kê tồn kho</div>
      <nav style={{ display: 'flex', alignItems: 'center' }}>
        <a href="/dashboard">Kiểm kê</a>
        <a href="/history">Lịch sử</a>
        {isAdmin && <a href="/admin">Quản trị</a>}
        <span style={{ marginLeft: 16, fontSize: 13, opacity: .9 }}>👤 {hoTen}</span>
        <a href="#" onClick={e => { e.preventDefault(); logout() }} style={{ marginLeft: 12 }}>Đăng xuất</a>
      </nav>
    </div>
  )
}
