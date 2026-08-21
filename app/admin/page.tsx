'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import TopBar from '@/components/TopBar'

export const dynamic = 'force-dynamic'

type Profile = {
  id: string; ma_nv: string; ho_ten: string; vai_tro: string
  quyen_sua: boolean; created_at: string
}

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

  // Đọc danh sách nhân viên THẲNG từ bảng profiles (chắc chắn hiện đủ)
  const fetchStaff = useCallback(async () => {
    const { data } = await supabase.from('profiles')
      .select('id,ma_nv,ho_ten,vai_tro,quyen_sua,created_at')
      .order('ma_nv')
    setStaff(data || [])
  }, [supabase])

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    setToken(session.access_token)
    const { data: prof } = await supabase.from('profiles')
      .select('*').eq('id', session.user.id).single()
    if (prof?.vai_tro !== 'admin') { router.replace('/dashboard'); return }
    setMe(prof)
    await fetchStaff()
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
    fetchStaff()
  }

  async function xoaNv(id: string, ten: string) {
    if (!confirm(`Xóa nhân viên "${ten}"?`)) return
    await fetch('/api/staff', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    fetchStaff()
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

  // Bật/tắt quyền sửa-xóa cho 1 nhân viên
  async function doiQuyen(sp: Profile) {
    const moi = !sp.quyen_sua
    const { error } = await supabase.from('profiles')
      .update({ quyen_sua: moi }).eq('id', sp.id)
    if (error) { alert('Lỗi: ' + error.message); return }
    fetchStaff()
  }

  if (loading) return <div className="center"><p className="muted">Đang tải…</p></div>

  return (
    <>
      <TopBar hoTen={me?.ho_ten || ''} isAdmin />
      <div className="wrap">
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))', color: '#fff', border: 'none' }}>
          <h1 style={{ color: '#fff', marginBottom: 4 }}>Trang Quản trị</h1>
          <p style={{ color: 'rgba(255,255,255,.85)', fontSize: 14 }}>Quản lý nhân viên, sản phẩm, phân quyền và xem báo cáo tồn kho.</p>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          <a href="/admin/bao-cao" style={{ textDecoration: 'none' }}>
            <div className="card admin-tile" style={{ margin: 0, borderTop: '3px solid #dc2626' }}>
              <div style={{ fontSize: 28 }}>📊</div>
              <div style={{ fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>Báo cáo chênh lệch</div>
              <div className="muted" style={{ fontSize: 13 }}>Thống kê thiếu/dư theo nhóm hàng</div>
            </div>
          </a>
          <a href="/admin/san-pham" style={{ textDecoration: 'none' }}>
            <div className="card admin-tile" style={{ margin: 0, borderTop: '3px solid var(--brand)' }}>
              <div style={{ fontSize: 28 }}>📦</div>
              <div style={{ fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>Danh mục sản phẩm</div>
              <div className="muted" style={{ fontSize: 13 }}>Thêm / xóa / phân nhóm sản phẩm</div>
            </div>
          </a>
          <a href="/admin/qr" style={{ textDecoration: 'none' }}>
            <div className="card admin-tile" style={{ margin: 0, borderTop: '3px solid #16a34a' }}>
              <div style={{ fontSize: 28 }}>🔗</div>
              <div style={{ fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>Mã QR đăng nhập</div>
              <div className="muted" style={{ fontSize: 13 }}>In tờ QR dán tại kho</div>
            </div>
          </a>
        </div>

        <div className="card">
          <h2>Thêm nhân viên</h2>
          <div className="row">
            <div><label>Mã NV</label><input value={maNv} onChange={e => setMaNv(e.target.value)} placeholder="NV013" /></div>
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
          <p className="muted" style={{ marginBottom: 12 }}>
            Cột <b>Quyền sửa/xóa</b>: bật để cho nhân viên đó được sửa số lượng và xóa dữ liệu tồn kho (như admin). Mặc định nhân viên chỉ được thêm mới.
          </p>
          <table>
            <thead><tr>
              <th>Mã NV</th><th>Họ tên</th><th>Vai trò</th><th>Quyền sửa/xóa</th><th></th>
            </tr></thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id}>
                  <td><b>{s.ma_nv}</b></td>
                  <td>{s.ho_ten}</td>
                  <td>{s.vai_tro === 'admin' ? '🛡 Quản trị' : 'Nhân viên'}</td>
                  <td>
                    {s.vai_tro === 'admin' ? (
                      <span className="tag them">Toàn quyền</span>
                    ) : (
                      <button
                        className={`sm ${s.quyen_sua ? '' : 'ghost'}`}
                        onClick={() => doiQuyen(s)}
                        style={s.quyen_sua ? { background: 'var(--ok)' } : {}}>
                        {s.quyen_sua ? '✓ Đã cấp quyền' : 'Cấp quyền'}
                      </button>
                    )}
                  </td>
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
