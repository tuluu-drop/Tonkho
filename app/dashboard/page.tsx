'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, NHOM_HANG } from '@/lib/supabase'
import TopBar from '@/components/TopBar'

type Profile = { id: string; ho_ten: string; vai_tro: string }
type Session = { id: string; nhom_hang: string; ten_phien: string; trang_thai: string; created_at: string }

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [nhom, setNhom] = useState('vali')
  const [tenPhien, setTenPhien] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    const { data: prof } = await supabase.from('profiles')
      .select('id,ho_ten,vai_tro').eq('id', session.user.id).single()
    setProfile(prof)
    const { data: sess } = await supabase.from('sessions')
      .select('*').order('created_at', { ascending: false })
    setSessions(sess || [])
    setLoading(false)
  }, [router, supabase])

  useEffect(() => { load() }, [load])

  async function taoPhien() {
    if (!tenPhien.trim() || !profile) return
    const { error } = await supabase.from('sessions').insert({
      nhom_hang: nhom, ten_phien: tenPhien.trim(), created_by: profile.id,
    })
    if (!error) { setTenPhien(''); load() }
  }

  if (loading) return <div className="center"><p className="muted">Đang tải…</p></div>

  return (
    <>
      <TopBar hoTen={profile?.ho_ten || ''} isAdmin={profile?.vai_tro === 'admin'} />
      <div className="wrap">
        <div className="card">
          <h2>Tạo phiên kiểm kê mới</h2>
          <div className="row">
            <div style={{ flex: '0 0 160px' }}>
              <label>Nhóm hàng</label>
              <select value={nhom} onChange={e => setNhom(e.target.value)}>
                {Object.entries(NHOM_HANG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label>Tên phiên</label>
              <input value={tenPhien} onChange={e => setTenPhien(e.target.value)}
                placeholder="VD: Kiểm kê Vali T08/2026"
                onKeyDown={e => e.key === 'Enter' && taoPhien()} />
            </div>
            <div style={{ flex: '0 0 auto' }}>
              <label>&nbsp;</label>
              <button onClick={taoPhien} disabled={!tenPhien.trim()}>+ Tạo phiên</button>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Danh sách phiên kiểm kê</h2>
          {sessions.length === 0 && <p className="muted">Chưa có phiên nào. Tạo phiên đầu tiên ở trên.</p>}
          <div className="grid">
            {sessions.map(s => (
              <div key={s.id}
                className={`session-card ${s.trang_thai === 'da_dong' ? 'closed' : ''}`}
                onClick={() => router.push(`/dashboard/${s.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className={`tag ${s.nhom_hang}`}>{NHOM_HANG[s.nhom_hang]}</span>
                  <span className={`badge ${s.trang_thai === 'dang_mo' ? 'open' : 'closed'}`}>
                    {s.trang_thai === 'dang_mo' ? 'Đang mở' : 'Đã đóng'}
                  </span>
                </div>
                <div style={{ fontWeight: 600 }}>{s.ten_phien}</div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {new Date(s.created_at).toLocaleString('vi-VN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
