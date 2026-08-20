'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, NHOM_HANG } from '@/lib/supabase'
import TopBar from '@/components/TopBar'

export const dynamic = 'force-dynamic'

type Profile = { id: string; ho_ten: string; vai_tro: string }
type Log = {
  id: number; sku: string; ten_sp: string; thao_tac: string
  sl_cu: number | null; sl_moi: number | null; ma_nv: string; ho_ten: string
  created_at: string; session_id: string
}
type Sess = { id: string; ten_phien: string; nhom_hang: string }

const TT: Record<string, string> = { them: 'Thêm mới', sua_sl: 'Sửa SL', xoa: 'Xóa' }

export default function History() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [sessMap, setSessMap] = useState<Record<string, Sess>>({})
  const [loading, setLoading] = useState(true)
  const [fSession, setFSession] = useState('')
  const [fUser, setFUser] = useState('')

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    const { data: prof } = await supabase.from('profiles')
      .select('id,ho_ten,vai_tro').eq('id', session.user.id).single()
    setProfile(prof)
    const { data: sess } = await supabase.from('sessions').select('id,ten_phien,nhom_hang')
    const map: Record<string, Sess> = {}
    ;(sess || []).forEach(s => { map[s.id] = s })
    setSessMap(map)
    const { data: lg } = await supabase.from('audit_log')
      .select('*').order('created_at', { ascending: false }).limit(500)
    setLogs(lg || [])
    setLoading(false)
  }, [router, supabase])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="center"><p className="muted">Đang tải…</p></div>

  const users = Array.from(new Set(logs.map(l => l.ho_ten))).filter(Boolean)
  const filtered = logs.filter(l =>
    (!fSession || l.session_id === fSession) &&
    (!fUser || l.ho_ten === fUser))

  return (
    <>
      <TopBar hoTen={profile?.ho_ten || ''} isAdmin={profile?.vai_tro === 'admin'} />
      <div className="wrap">
        <div className="card">
          <h1>Lịch sử nhập liệu</h1>
          <p className="muted">Toàn bộ thao tác thêm / sửa / xóa — ai làm, khi nào.</p>
          <div className="row" style={{ marginTop: 12 }}>
            <div>
              <label>Lọc theo phiên</label>
              <select value={fSession} onChange={e => setFSession(e.target.value)}>
                <option value="">— Tất cả phiên —</option>
                {Object.values(sessMap).map(s => (
                  <option key={s.id} value={s.id}>{s.ten_phien}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Lọc theo nhân viên</label>
              <select value={fUser} onChange={e => setFUser(e.target.value)}>
                <option value="">— Tất cả nhân viên —</option>
                {users.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th><th>Nhân viên</th><th>Phiên</th>
                <th>Thao tác</th><th>SKU</th><th>Tên SP</th><th>SL</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id}>
                  <td className="muted">{new Date(l.created_at).toLocaleString('vi-VN')}</td>
                  <td><b>{l.ho_ten}</b><br /><span className="muted">{l.ma_nv}</span></td>
                  <td>
                    {sessMap[l.session_id]
                      ? <span className={`tag ${sessMap[l.session_id].nhom_hang}`}>{sessMap[l.session_id].ten_phien}</span>
                      : '—'}
                  </td>
                  <td><span className={`tag ${l.thao_tac}`}>{TT[l.thao_tac]}</span></td>
                  <td>{l.sku}</td>
                  <td>{l.ten_sp}</td>
                  <td>
                    {l.thao_tac === 'sua_sl'
                      ? <span>{l.sl_cu} → <b>{l.sl_moi}</b></span>
                      : l.thao_tac === 'them' ? <b>{l.sl_moi}</b> : <s>{l.sl_cu}</s>}
                  </td>
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
