'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import QRCode from 'qrcode'

export const dynamic = 'force-dynamic'

type Profile = { id: string; ma_nv: string; ho_ten: string; vai_tro: string; created_at: string }

export default function Admin() {
  const router = useRouter()
  const supabase = createClient()
  const [me, setMe] = useState<Profile | null>(null)
  const [token, setToken] = useState('')
  const [staff, setStaff] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [maNv, setMaNv] = useState('')
  const [hoTen, setHoTen] = useState('')
  const [matKhau, setMatKhau] = useState('')
  const [vaiTro, setVaiTro] = useState('staff')
  const [msg, setMsg] = useState('')
  const [qrUrl, setQrUrl] = useState('')

  const fetchStaff = useCallback(async (tk: string) => {
    const res = await fetch('/api/staff', { headers: { authorization: `Bearer ${tk}` } })
    const j = await res.json()
    if (res.ok) setStaff(j.data || [])
  }, [])

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    setToken(session.access_token)
    const { data: prof } = await supabase.from('profiles')
      .select('*').eq('id', session.user.id).single()
    if (prof?.vai_tro !== 'admin') { router.replace('/dashboard'); return }
    setMe(prof)
    await fetchStaff(session.access_token)
    // Tạo QR trỏ về trang login (QR chung)
    const loginUrl = `${window.location.origin}/login`
    setQrUrl(await QRCode.toDataURL(loginUrl, { width: 220, margin: 1 }))
    setLoading(false)
  }, [router, supabase, fetchStaff])

  useEffect(() => { load() }, [load])

  async function taoNv() {
    setMsg('')
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ ma_nv: maNv, ho_ten: hoTen, mat_khau: matKhau, vai_tro: vaiTro }),
    })
    const j = await res.json()
    if (!res.ok) { setMsg('Lỗi: ' + j.error); return }
    setMaNv(''); setHoTen(''); setMatKhau(''); setVaiTro('staff'); setMsg('✓ Đã tạo nhân viên')
    fetchStaff(token)
  }

  async function xoaNv(id: string, ten: string) {
    if (!confirm(`Xóa nhân viên "${ten}"?`)) return
    await fetch('/api/staff', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    fetchStaff(token)
  }

  async function resetPass(id: string, ten: string) {
    const mk = prompt(`Mật khẩu mới cho "${ten}":`)
    if (!mk) return
    const res = await fetch('/api/staff', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ id, mat_khau: mk }),
    })
    alert(res.ok ? '✓ Đã đổi mật khẩu' : '✗ Lỗi')
  }

  if (loading) return <div className="center"><p className="muted">Đang tải…</p></div>

  return (
    <>
      <TopBar hoTen={me?.ho_ten || ''} isAdmin />
      <div className="wrap">
        <div className="card">
          <h1>Quản trị nhân viên</h1>
        </div>

        <div className="card">
          <h2>QR đăng nhập chung</h2>
          <p className="muted">In mã này dán tại kho. Nhân viên quét → mở trang đăng nhập, nhập Mã NV + mật khẩu riêng.</p>
          {qrUrl && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <img src={qrUrl} alt="QR đăng nhập" style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 8, background: '#fff' }} />
              <div className="muted" style={{ marginTop: 8 }}>{typeof window !== 'undefined' ? `${window.location.origin}/login` : ''}</div>
              <button className="ghost sm" style={{ marginTop: 8 }} onClick={() => window.print()}>🖨 In QR</button>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Thêm nhân viên</h2>
          <div className="row">
            <div><label>Mã NV</label><input value={maNv} onChange={e => setMaNv(e.target.value)} placeholder="NV001" /></div>
            <div><label>Họ tên</label><input value={hoTen} onChange={e => setHoTen(e.target.value)} placeholder="Nguyễn Văn A" /></div>
            <div><label>Mật khẩu</label><input value={matKhau} onChange={e => setMatKhau(e.target.value)} placeholder="≥ 6 ký tự" /></div>
            <div style={{ flex: '0 0 130px' }}>
              <label>Vai trò</label>
              <select value={vaiTro} onChange={e => setVaiTro(e.target.value)}>
                <option value="staff">Nhân viên</option>
                <option value="admin">Quản trị</option>
              </select>
            </div>
            <div style={{ flex: '0 0 auto' }}><label>&nbsp;</label><button onClick={taoNv} disabled={!maNv || !hoTen || matKhau.length < 6}>+ Tạo</button></div>
          </div>
          {msg && <div className={msg.startsWith('✓') ? 'muted' : 'err'} style={{ marginTop: 8 }}>{msg}</div>}
        </div>

        <div className="card">
          <h2>Danh sách nhân viên ({staff.length})</h2>
          <table>
            <thead><tr><th>Mã NV</th><th>Họ tên</th><th>Vai trò</th><th>Ngày tạo</th><th></th></tr></thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id}>
                  <td><b>{s.ma_nv}</b></td>
                  <td>{s.ho_ten}</td>
                  <td>{s.vai_tro === 'admin' ? '🛡 Quản trị' : 'Nhân viên'}</td>
                  <td className="muted">{new Date(s.created_at).toLocaleDateString('vi-VN')}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="sm ghost" onClick={() => resetPass(s.id, s.ho_ten)}>Đổi MK</button>{' '}
                    {s.id !== me?.id && <button className="sm danger" onClick={() => xoaNv(s.id, s.ho_ten)}>Xóa</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
