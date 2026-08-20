'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient, NHOM_HANG } from '@/lib/supabase'
import TopBar from '@/components/TopBar'

type Profile = { id: string; ho_ten: string; vai_tro: string }
type Session = { id: string; nhom_hang: string; ten_phien: string; trang_thai: string }
type Item = { id: string; sku: string; ten_sp: string; so_luong: number; ghi_chu: string | null; updated_at: string }

export default function SessionDetail() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [sess, setSess] = useState<Session | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [sku, setSku] = useState('')
  const [tenSp, setTenSp] = useState('')
  const [sl, setSl] = useState('')
  const [ghiChu, setGhiChu] = useState('')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    const { data: prof } = await supabase.from('profiles')
      .select('id,ho_ten,vai_tro').eq('id', session.user.id).single()
    setProfile(prof)
    const { data: s } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
    setSess(s)
    const { data: inv } = await supabase.from('inventory')
      .select('*').eq('session_id', sessionId).order('ten_sp')
    setItems(inv || [])
    setLoading(false)
  }, [router, supabase, sessionId])

  useEffect(() => { load() }, [load])

  const daDong = sess?.trang_thai === 'da_dong'

  async function themSp() {
    if (!sku.trim() || !tenSp.trim()) return
    const { error } = await supabase.from('inventory').insert({
      session_id: sessionId, sku: sku.trim(), ten_sp: tenSp.trim(),
      so_luong: parseInt(sl) || 0, ghi_chu: ghiChu.trim() || null,
      updated_by: profile?.id,
    })
    if (error) { alert('SKU đã tồn tại trong phiên hoặc lỗi: ' + error.message); return }
    setSku(''); setTenSp(''); setSl(''); setGhiChu(''); load()
  }

  async function suaSl(item: Item, moi: number) {
    await supabase.from('inventory').update({
      so_luong: moi, updated_by: profile?.id, updated_at: new Date().toISOString(),
    }).eq('id', item.id)
    load()
  }

  async function xoaSp(item: Item) {
    if (!confirm(`Xóa "${item.ten_sp}"?`)) return
    await supabase.from('inventory').delete().eq('id', item.id)
    load()
  }

  async function doiTrangThai() {
    const moi = daDong ? 'dang_mo' : 'da_dong'
    await supabase.from('sessions').update({ trang_thai: moi }).eq('id', sessionId)
    load()
  }

  if (loading) return <div className="center"><p className="muted">Đang tải…</p></div>

  const filtered = items.filter(i =>
    i.sku.toLowerCase().includes(q.toLowerCase()) ||
    i.ten_sp.toLowerCase().includes(q.toLowerCase()))
  const tongSL = items.reduce((a, b) => a + b.so_luong, 0)

  return (
    <>
      <TopBar hoTen={profile?.ho_ten || ''} isAdmin={profile?.vai_tro === 'admin'} />
      <div className="wrap">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <a href="/dashboard" className="muted" style={{ textDecoration: 'none' }}>← Về danh sách</a>
              <h1 style={{ marginTop: 8 }}>{sess?.ten_phien}</h1>
              <span className={`tag ${sess?.nhom_hang}`}>{NHOM_HANG[sess?.nhom_hang || '']}</span>
              <span className="muted" style={{ marginLeft: 12 }}>
                {items.length} SKU · Tổng SL: <b>{tongSL}</b>
              </span>
            </div>
            <button className="ghost" onClick={doiTrangThai}>
              {daDong ? '🔓 Mở lại phiên' : '🔒 Đóng phiên'}
            </button>
          </div>
        </div>

        {!daDong && (
          <div className="card">
            <h2>Thêm sản phẩm</h2>
            <div className="row">
              <div style={{ flex: '0 0 140px' }}>
                <label>Mã SP (SKU)</label>
                <input value={sku} onChange={e => setSku(e.target.value)} placeholder="VD: VL-2024-01" />
              </div>
              <div>
                <label>Tên sản phẩm</label>
                <input value={tenSp} onChange={e => setTenSp(e.target.value)} placeholder="Tên SP" />
              </div>
              <div style={{ flex: '0 0 100px' }}>
                <label>Số lượng</label>
                <input type="number" value={sl} onChange={e => setSl(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label>Ghi chú</label>
                <input value={ghiChu} onChange={e => setGhiChu(e.target.value)} placeholder="(tùy chọn)" />
              </div>
              <div style={{ flex: '0 0 auto' }}>
                <label>&nbsp;</label>
                <button onClick={themSp}>+ Thêm</button>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Danh sách kiểm kê</h2>
            <input style={{ maxWidth: 240 }} value={q} onChange={e => setQ(e.target.value)}
              placeholder="🔍 Tìm SKU / tên SP" />
          </div>
          {filtered.length === 0 ? (
            <p className="muted">Chưa có sản phẩm nào.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>SKU</th><th>Tên SP</th><th>Số lượng</th><th>Ghi chú</th><th>Cập nhật</th>
                  {!daDong && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id}>
                    <td><b>{item.sku}</b></td>
                    <td>{item.ten_sp}</td>
                    <td>
                      {daDong ? item.so_luong : (
                        <input type="number" defaultValue={item.so_luong} style={{ width: 80 }}
                          onBlur={e => {
                            const v = parseInt(e.target.value)
                            if (!isNaN(v) && v !== item.so_luong) suaSl(item, v)
                          }} />
                      )}
                    </td>
                    <td className="muted">{item.ghi_chu || '—'}</td>
                    <td className="muted">{new Date(item.updated_at).toLocaleString('vi-VN')}</td>
                    {!daDong && (
                      <td><button className="sm danger" onClick={() => xoaSp(item)}>Xóa</button></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
