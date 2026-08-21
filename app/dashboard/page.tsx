'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, NHOM_HANG } from '@/lib/supabase'
import TopBar from '@/components/TopBar'

export const dynamic = 'force-dynamic'

type Profile = { id: string; ho_ten: string; vai_tro: string }
type SanPham = { id: string; ten_sp: string; nhom_hang: string }
type TonKho = {
  id: string; ten_sp: string; nhom_hang: string; so_luong: number
  ghi_chu: string | null; ma_nv: string | null; ho_ten: string | null; updated_at: string
}

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [items, setItems] = useState<TonKho[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [fNhom, setFNhom] = useState('')

  // Autocomplete chọn SP
  const [search, setSearch] = useState('')
  const [goiY, setGoiY] = useState<SanPham[]>([])
  const [chon, setChon] = useState<SanPham | null>(null)
  const [sl, setSl] = useState('')
  const [ghiChu, setGhiChu] = useState('')
  const [showList, setShowList] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [warning, setWarning] = useState('')
  const [saving, setSaving] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const isAdmin = profile?.vai_tro === 'admin'

  const taiTonKho = useCallback(async () => {
    const { data } = await supabase.from('ton_kho').select('*').order('updated_at', { ascending: false })
    setItems(data || [])
  }, [supabase])

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    const { data: prof } = await supabase.from('profiles')
      .select('id,ho_ten,vai_tro,phai_doi_mk').eq('id', session.user.id).single()
    if (prof?.phai_doi_mk) { router.replace('/doi-mat-khau'); return }
    setProfile(prof)
    await taiTonKho()
    setLoading(false)
  }, [router, supabase, taiTonKho])

  useEffect(() => { load() }, [load])

  // Tìm gợi ý SP
  useEffect(() => {
    if (search.trim().length < 1) { setGoiY([]); return }
    let cancel = false
    const t = setTimeout(async () => {
      const { data } = await supabase.from('san_pham')
        .select('id,ten_sp,nhom_hang').ilike('ten_sp', `%${search.trim()}%`)
        .eq('active', true).limit(20)
      if (!cancel) { setGoiY(data || []); setActiveIdx(0) }
    }, 200)
    return () => { cancel = true; clearTimeout(t) }
  }, [search, supabase])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowList(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function chonSP(sp: SanPham) {
    setChon(sp); setSearch(sp.ten_sp); setShowList(false); setWarning('')
    // Kiểm tra SP đã được cập nhật chưa
    const daCo = items.find(i => i.ten_sp === sp.ten_sp)
    if (daCo) {
      setWarning(`⚠️ "${sp.ten_sp}" đã được ${daCo.ho_ten || daCo.ma_nv || 'người khác'} cập nhật lúc ${new Date(daCo.updated_at).toLocaleString('vi-VN')} (SL: ${daCo.so_luong}). Không thể cập nhật lại. Liên hệ quản trị nếu cần sửa.`)
    }
  }

  async function luu() {
    if (!chon) return
    setWarning(''); setSaving(true)
    // Kiểm tra lại lần cuối (phòng người khác vừa nhập)
    const { data: existing } = await supabase.from('ton_kho')
      .select('*').eq('ten_sp', chon.ten_sp).maybeSingle()
    if (existing) {
      setSaving(false)
      setWarning(`⚠️ "${chon.ten_sp}" đã được ${existing.ho_ten || existing.ma_nv || 'người khác'} cập nhật lúc ${new Date(existing.updated_at).toLocaleString('vi-VN')} (SL: ${existing.so_luong}). Không thể cập nhật lại.`)
      taiTonKho()
      return
    }
    const { error } = await supabase.from('ton_kho').insert({
      ten_sp: chon.ten_sp, nhom_hang: chon.nhom_hang,
      so_luong: parseInt(sl) || 0, ghi_chu: ghiChu.trim() || null,
      updated_by: profile?.id, ma_nv: null, ho_ten: profile?.ho_ten,
    })
    setSaving(false)
    if (error) {
      if (error.message.includes('duplicate')) {
        setWarning(`⚠️ "${chon.ten_sp}" vừa được người khác cập nhật. Không thể ghi đè.`)
        taiTonKho()
      } else setWarning('Lỗi: ' + error.message)
      return
    }
    setChon(null); setSearch(''); setSl(''); setGhiChu(''); setGoiY([]); taiTonKho()
  }

  // Admin: sửa số lượng
  async function suaSl(item: TonKho, moi: number) {
    if (!isAdmin) return
    await supabase.from('ton_kho').update({
      so_luong: moi, updated_by: profile?.id, ho_ten: profile?.ho_ten,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id)
    taiTonKho()
  }

  // Admin: xóa
  async function xoa(item: TonKho) {
    if (!isAdmin) return
    if (!confirm(`Xóa "${item.ten_sp}" khỏi tồn kho? (để nhân viên cập nhật lại)`)) return
    await supabase.from('ton_kho').delete().eq('id', item.id)
    taiTonKho()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!showList || goiY.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i+1, goiY.length-1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i-1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); chonSP(goiY[activeIdx]) }
  }

  if (loading) return <div className="center"><p className="muted">Đang tải…</p></div>

  const filtered = items.filter(i =>
    i.ten_sp.toLowerCase().includes(q.toLowerCase()) &&
    (!fNhom || i.nhom_hang === fNhom))
  const tongSL = items.reduce((a, b) => a + b.so_luong, 0)

  return (
    <>
      <TopBar hoTen={profile?.ho_ten || ''} isAdmin={isAdmin} />
      <div className="wrap">
        <div className="card">
          <h1>Cập nhật tồn kho</h1>
          <p className="muted">Chọn sản phẩm thiếu → nhập số lượng → lưu. Mỗi sản phẩm chỉ cập nhật <b>một lần</b>.</p>
        </div>

        <div className="card">
          <h2>Chọn sản phẩm cần cập nhật</h2>
          <div className="row">
            <div ref={boxRef} className="ac-wrap" style={{ flex: 2 }}>
              <label>Tìm sản phẩm (gõ vài ký tự)</label>
              <input value={search}
                onChange={e => { setSearch(e.target.value); setChon(null); setShowList(true); setWarning('') }}
                onFocus={() => setShowList(true)}
                onKeyDown={onKeyDown}
                placeholder="VD: herschel, samsonite…" autoComplete="off" />
              {showList && search.trim().length >= 1 && (
                <div className="ac-list">
                  {goiY.length === 0 ? (
                    <div className="ac-empty">Không tìm thấy sản phẩm</div>
                  ) : goiY.map((sp, idx) => {
                    const daCo = items.some(i => i.ten_sp === sp.ten_sp)
                    return (
                      <div key={sp.id}
                        className={`ac-item ${idx === activeIdx ? 'active' : ''}`}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => chonSP(sp)}>
                        <span className="ten">
                          {sp.ten_sp}
                          {daCo && <span style={{ color: 'var(--warn)', fontSize: 12, marginLeft: 6 }}>• đã cập nhật</span>}
                        </span>
                        <span className={`tag ${sp.nhom_hang}`}>{NHOM_HANG[sp.nhom_hang]}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div style={{ flex: '0 0 110px' }}>
              <label>Số lượng thiếu</label>
              <input type="number" value={sl} onChange={e => setSl(e.target.value)}
                placeholder="0" disabled={!!warning} />
            </div>
            <div>
              <label>Ghi chú</label>
              <input value={ghiChu} onChange={e => setGhiChu(e.target.value)}
                placeholder="(tùy chọn)" disabled={!!warning} />
            </div>
            <div style={{ flex: '0 0 auto' }}>
              <label>&nbsp;</label>
              <button onClick={luu} disabled={!chon || !!warning || saving}>
                {saving ? 'Đang lưu…' : '✓ Lưu'}
              </button>
            </div>
          </div>
          {warning && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef3c7',
              border: '1px solid #fcd34d', borderRadius: 8, color: '#92400e', fontSize: 14 }}>
              {warning}
            </div>
          )}
          {chon && !warning && (
            <p className="muted" style={{ marginTop: 8 }}>
              Đã chọn: <b>{chon.ten_sp}</b> — nhập số lượng rồi bấm Lưu.
            </p>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ margin: 0 }}>Đã cập nhật ({items.length} SP · Tổng: {tongSL})</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={fNhom} onChange={e => setFNhom(e.target.value)} style={{ width: 150 }}>
                <option value="">— Tất cả nhóm —</option>
                {Object.entries(NHOM_HANG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input style={{ width: 200 }} value={q} onChange={e => setQ(e.target.value)}
                placeholder="🔍 Lọc theo tên" />
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="muted">Chưa có sản phẩm nào được cập nhật.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Tên sản phẩm</th><th>Nhóm</th><th>SL</th><th>Người cập nhật</th><th>Thời gian</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id}>
                    <td>{item.ten_sp}</td>
                    <td><span className={`tag ${item.nhom_hang}`}>{NHOM_HANG[item.nhom_hang]}</span></td>
                    <td>
                      {isAdmin ? (
                        <input type="number" defaultValue={item.so_luong} style={{ width: 70 }}
                          onBlur={e => {
                            const v = parseInt(e.target.value)
                            if (!isNaN(v) && v !== item.so_luong) suaSl(item, v)
                          }} />
                      ) : <b>{item.so_luong}</b>}
                    </td>
                    <td>{item.ho_ten || item.ma_nv || '—'}</td>
                    <td className="muted">{new Date(item.updated_at).toLocaleString('vi-VN')}</td>
                    {isAdmin && (
                      <td><button className="sm danger" onClick={() => xoa(item)}>Xóa</button></td>
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
