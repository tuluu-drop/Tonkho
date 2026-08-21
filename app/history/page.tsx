'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, NHOM_HANG } from '@/lib/supabase'
import TopBar from '@/components/TopBar'

export const dynamic = 'force-dynamic'

type Profile = { id: string; ho_ten: string; vai_tro: string }
type Log = {
  id: number; ten_sp: string; nhom_hang: string | null; thao_tac: string
  so_luong: number | null; ma_nv: string | null; ho_ten: string | null; created_at: string
}

const TT: Record<string, string> = { cap_nhat: 'Cập nhật', sua: 'Sửa (admin)', xoa: 'Xóa (admin)' }

export default function History() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [fUser, setFUser] = useState('')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    const { data: prof } = await supabase.from('profiles')
      .select('id,ho_ten,vai_tro,phai_doi_mk').eq('id', session.user.id).single()
    if (prof?.phai_doi_mk) { router.replace('/doi-mat-khau'); return }
    setProfile(prof)
    const { data: lg } = await supabase.from('lich_su')
      .select('*').order('created_at', { ascending: false }).limit(500)
    setLogs(lg || [])
    setLoading(false)
  }, [router, supabase])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="center"><p className="muted">Đang tải…</p></div>

  const users = Array.from(new Set(logs.map(l => l.ho_ten).filter(Boolean))) as string[]
  const filtered = logs.filter(l =>
    (!fUser || l.ho_ten === fUser) &&
    (!q || l.ten_sp.toLowerCase().includes(q.toLowerCase())))

  return (
    <>
      <TopBar hoTen={profile?.ho_ten || ''} isAdmin={profile?.vai_tro === 'admin'} />
      <div className="wrap">
        <div className="card">
          <h1>Lịch sử cập nhật</h1>
          <p className="muted">Toàn bộ thao tác — ai cập nhật sản phẩm nào, số lượng bao nhiêu, lúc nào.</p>
          <div className="row" style={{ marginTop: 12 }}>
            <div>
              <label>Lọc theo nhân viên</label>
              <select value={fUser} onChange={e => setFUser(e.target.value)}>
                <option value="">— Tất cả nhân viên —</option>
                {users.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label>Tìm sản phẩm</label>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 Tên sản phẩm" />
            </div>
          </div>
        </div>

        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th><th>Nhân viên</th><th>Thao tác</th>
                <th>Sản phẩm</th><th>Nhóm</th><th>SL</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id}>
                  <td className="muted">{new Date(l.created_at).toLocaleString('vi-VN')}</td>
                  <td><b>{l.ho_ten || l.ma_nv || '—'}</b></td>
                  <td><span className={`tag ${l.thao_tac === 'cap_nhat' ? 'them' : l.thao_tac === 'sua' ? 'sua_sl' : 'xoa'}`}>{TT[l.thao_tac]}</span></td>
                  <td>{l.ten_sp}</td>
                  <td>{l.nhom_hang ? <span className={`tag ${l.nhom_hang}`}>{NHOM_HANG[l.nhom_hang]}</span> : '—'}</td>
                  <td><b>{l.so_luong ?? '—'}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="muted">Chưa có lịch sử.</p>}
        </div>
      </div>
    </>
  )
}
