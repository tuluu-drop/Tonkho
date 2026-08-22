'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, NHOM_HANG } from '@/lib/supabase'
import TopBar from '@/components/TopBar'

export const dynamic = 'force-dynamic'

type Profile = { id: string; ho_ten: string; vai_tro: string }
type SanPham = { id: string; ten_sp: string; nhom_hang: string; active: boolean }

export default function QuanLySanPham() {
  const router = useRouter()
  const supabase = createClient()
  const [me, setMe] = useState<Profile | null>(null)
  const [list, setList] = useState<SanPham[]>([])
  const [tong, setTong] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [fNhom, setFNhom] = useState('')
  // form thêm
  const [tenMoi, setTenMoi] = useState('')
  const [nhomMoi, setNhomMoi] = useState('vali')
  const [msg, setMsg] = useState('')

  const taiDanhSach = useCallback(async (kw: string, nhom: string) => {
    let query = supabase.from('san_pham').select('*', { count: 'exact' }).order('ten_sp')
    if (kw.trim()) query = query.ilike('ten_sp', `%${kw.trim()}%`)
    if (nhom) query = query.eq('nhom_hang', nhom)
    const { data, count } = await query.limit(100)
    setList(data || []); setTong(count || 0)
  }, [supabase])

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    const { data: prof } = await supabase.from('profiles')
      .select('id,ho_ten,vai_tro').eq('id', session.user.id).single()
    if (prof?.vai_tro !== 'admin') { router.replace('/dashboard'); return }
    setMe(prof)
    await taiDanhSach('', '')
    setLoading(false)
  }, [router, supabase, taiDanhSach])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!loading) { const t = setTimeout(() => taiDanhSach(q, fNhom), 250); return () => clearTimeout(t) }
  }, [q, fNhom, loading, taiDanhSach])

  async function themSP() {
    setMsg('')
    // Tách nhiều dòng, mỗi dòng 1 tên SP, bỏ dòng trống + trùng lặp
    const ten = tenMoi.split('\n').map(t => t.trim()).filter(Boolean)
    const unique = Array.from(new Set(ten))
    if (unique.length === 0) return
    const rows = unique.map(t => ({ ten_sp: t, nhom_hang: nhomMoi }))
    const { data, error } = await supabase.from('san_pham')
      .insert(rows).select()
    if (error) {
      // Vẫn có thể thêm được phần không trùng nhờ ... nhưng insert lô fail toàn bộ nếu 1 cái trùng
      // -> chuyển sang thêm từng cái, bỏ qua trùng
      let ok = 0, trung = 0
      for (const r of rows) {
        const { error: e2 } = await supabase.from('san_pham').insert(r)
        if (e2) { if (e2.message.includes('duplicate')) trung++; }
        else ok++
      }
      setTenMoi(''); taiDanhSach(q, fNhom)
      setMsg(`✓ Đã thêm ${ok} SP mới${trung ? `, bỏ qua ${trung} SP đã tồn tại` : ''}.`)
      return
    }
    setTenMoi(''); taiDanhSach(q, fNhom)
    setMsg(`✓ Đã thêm ${data?.length || rows.length} sản phẩm mới.`)
  }

  async function xoaSP(sp: SanPham) {
    if (!confirm(`Xóa sản phẩm "${sp.ten_sp}" khỏi danh mục?`)) return
    await supabase.from('san_pham').delete().eq('id', sp.id)
    taiDanhSach(q, fNhom)
  }

  async function doiNhom(sp: SanPham, nhom: string) {
    await supabase.from('san_pham').update({ nhom_hang: nhom }).eq('id', sp.id)
    taiDanhSach(q, fNhom)
  }

  if (loading) return <div className="center"><p className="muted">Đang tải…</p></div>

  return (
    <>
      <TopBar hoTen={me?.ho_ten || ''} isAdmin />
      <div className="wrap">
        <div className="card">
          <a href="/admin" className="muted" style={{ textDecoration: 'none' }}>← Về Quản trị</a>
          <h1 style={{ marginTop: 8 }}>Quản lý danh mục sản phẩm</h1>
          <p className="muted">Tổng: <b>{tong}</b> sản phẩm. Thêm hoặc xóa sản phẩm tại đây — sản phẩm sẽ tự hiện trong ô gợi ý khi nhân viên kiểm kê.</p>
        </div>

        <div className="card">
          <h2>Thêm sản phẩm mới</h2>
          <p className="muted" style={{ marginBottom: 12 }}>Nhập <b>mỗi dòng một tên sản phẩm</b> (có thể dán nhiều dòng từ Excel), chọn nhóm hàng chung rồi bấm Thêm.</p>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 2 }}>
              <label>Tên sản phẩm (mỗi dòng 1 SP)</label>
              <textarea value={tenMoi} onChange={e => setTenMoi(e.target.value)}
                rows={6} placeholder={"VD:\nSamsonite Vali A 20\nHerschel Balo B\nAnse Túi C"}
                style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div style={{ flex: '0 0 160px' }}>
              <label>Nhóm hàng</label>
              <select value={nhomMoi} onChange={e => setNhomMoi(e.target.value)}>
                {Object.entries(NHOM_HANG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <div style={{ marginTop: 12 }}>
                <button onClick={themSP} disabled={!tenMoi.trim()} style={{ width: '100%' }}>+ Thêm tất cả</button>
              </div>
              {tenMoi.trim() && (
                <div className="muted" style={{ fontSize: 12, marginTop: 6, textAlign: 'center' }}>
                  {tenMoi.split('\n').map(t => t.trim()).filter(Boolean).length} dòng
                </div>
              )}
            </div>
          </div>
          {msg && <div className={msg.startsWith('✓') ? 'muted' : 'err'} style={{ marginTop: 8 }}>{msg}</div>}
        </div>

        <div className="card">
          <div className="row" style={{ marginBottom: 12 }}>
            <div style={{ flex: 2 }}>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 Tìm sản phẩm theo tên" />
            </div>
            <div style={{ flex: '0 0 180px' }}>
              <select value={fNhom} onChange={e => setFNhom(e.target.value)}>
                <option value="">— Tất cả nhóm —</option>
                {Object.entries(NHOM_HANG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <p className="muted" style={{ marginBottom: 8 }}>Hiển thị tối đa 100 SP. Dùng ô tìm để lọc.</p>
          <table>
            <thead><tr><th>Tên sản phẩm</th><th>Nhóm hàng</th><th></th></tr></thead>
            <tbody>
              {list.map(sp => (
                <tr key={sp.id}>
                  <td>{sp.ten_sp}</td>
                  <td>
                    <select value={sp.nhom_hang} onChange={e => doiNhom(sp, e.target.value)}
                      style={{ width: 130, padding: '4px 8px', fontSize: 13 }}>
                      {Object.entries(NHOM_HANG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td><button className="sm danger" onClick={() => xoaSP(sp)}>Xóa</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="muted">Không có sản phẩm nào khớp.</p>}
        </div>
      </div>
    </>
  )
}
