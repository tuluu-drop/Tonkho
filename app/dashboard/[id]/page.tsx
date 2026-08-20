'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient, NHOM_HANG } from '@/lib/supabase'
import TopBar from '@/components/TopBar'

export const dynamic = 'force-dynamic'

type Profile = { id: string; ho_ten: string; vai_tro: string }
type Session = { id: string; nhom_hang: string; ten_phien: string; trang_thai: string }
type Item = { id: string; sku: string; ten_sp: string; so_luong: number; ghi_chu: string | null; updated_at: string }
type SanPham = { id: string; ten_sp: string; nhom_hang: string }

export default function SessionDetail() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [sess, setSess] = useState<Session | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  // Autocomplete
  const [search, setSearch] = useState('')
  const [goiY, setGoiY] = useState<SanPham[]>([])
  const [chon, setChon] = useState<SanPham | null>(null)
  const [sl, setSl] = useState('')
  const [ghiChu, setGhiChu] = useState('')
  const [showList, setShowList] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

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

  // Tìm gợi ý sản phẩm khi gõ
  useEffect(() => {
    if (search.trim().length < 1) { setGoiY([]); return }
    let cancel = false
    const t = setTimeout(async () => {
      const { data } = await supabase.from('san_pham')
        .select('id,ten_sp,nhom_hang')
        .ilike('ten_sp', `%${search.trim()}%`)
        .eq('active', true)
        .limit(20)
      if (!cancel) { setGoiY(data || []); setActiveIdx(0) }
    }, 200)
    return () => { cancel = true; clearTimeout(t) }
  }, [search, supabase])

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowList(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const daDong = sess?.trang_thai === 'da_dong'

  function chonSP(sp: SanPham) {
    setChon(sp); setSearch(sp.ten_sp); setShowList(false)
  }

  async function themSp() {
    if (!chon) { alert('Vui lòng chọn sản phẩm từ gợi ý.'); return }
    const soLuong = parseInt(sl) || 0
    // Dùng tên SP làm cả sku (không cần mã riêng)
    const { error } = await supabase.from('inventory').insert({
      session_id: sessionId, sku: chon.ten_sp, ten_sp: chon.ten_sp,
      so_luong: soLuong, ghi_chu: ghiChu.trim() || null, updated_by: profile?.id,
    })
    if (error) {
      alert('SP này đã có trong phiên hoặc lỗi: ' + error.message); return
    }
    setChon(null); setSearch(''); setSl(''); setGhiChu(''); setGoiY([]); load()
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

  function onKeyDown(e: React.KeyboardEvent) {
    if (!showList || goiY.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i+1, goiY.length-1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i-1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); chonSP(goiY[activeIdx]) }
  }

  if (loading) return <div className="center"><p className="muted">Đang tải…</p></div>

  const filtered = items.filter(i =>
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
                {items.length} SP · Tổng SL: <b>{tongSL}</b>
              </span>
            </div>
            <button className="ghost" onClick={doiTrangThai}>
              {daDong ? '🔓 Mở lại phiên' : '🔒 Đóng phiên'}
            </button>
          </div>
        </div>

        {!daDong && (
          <div className="card">
            <h2>Thêm sản phẩm kiểm kê</h2>
            <div className="row">
              <div ref={boxRef} className="ac-wrap" style={{ flex: 2 }}>
                <label>Tìm sản phẩm (gõ vài ký tự)</label>
                <input value={search}
                  onChange={e => { setSearch(e.target.value); setChon(null); setShowList(true) }}
                  onFocus={() => setShowList(true)}
                  onKeyDown={onKeyDown}
                  placeholder="VD: herschel, vali samsonite…" autoComplete="off" />
                {showList && search.trim().length >= 1 && (
                  <div className="ac-list">
                    {goiY.length === 0 ? (
                      <div className="ac-empty">Không tìm thấy sản phẩm phù hợp</div>
                    ) : goiY.map((sp, idx) => (
                      <div key={sp.id}
                        className={`ac-item ${idx === activeIdx ? 'active' : ''}`}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => chonSP(sp)}>
                        <span className="ten">{sp.ten_sp}</span>
                        <span className={`tag ${sp.nhom_hang}`}>{NHOM_HANG[sp.nhom_hang]}</span>
                      </div>
                    ))}
                  </div>
                )}
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
                <button onClick={themSp} disabled={!chon}>+ Thêm</button>
              </div>
            </div>
            {chon && <p className="muted" style={{ marginTop: 8 }}>
              Đã chọn: <b>{chon.ten_sp}</b> — nhập số lượng rồi bấm Thêm.
            </p>}
          </div>
        )}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Danh sách đã kiểm kê</h2>
            <input style={{ maxWidth: 240 }} value={q} onChange={e => setQ(e.target.value)}
              placeholder="🔍 Lọc trong danh sách" />
          </div>
          {filtered.length === 0 ? (
            <p className="muted">Chưa có sản phẩm nào. Dùng ô tìm kiếm ở trên để thêm.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Tên sản phẩm</th><th>Số lượng</th><th>Ghi chú</th><th>Cập nhật</th>
                  {!daDong && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id}>
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
