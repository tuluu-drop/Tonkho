'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, NHOM_HANG } from '@/lib/supabase'
import Shell from '@/components/Shell'

export const dynamic = 'force-dynamic'

type Profile = { id: string; ho_ten: string; vai_tro: string; quyen_sua?: boolean }
type SanPham = { id: string; ten_sp: string; nhom_hang: string }
type GioItem = { ten_sp: string; nhom_hang: string; ton_he_thong: string; ton_thuc_te: string; ghi_chu: string }
type TonKho = {
  id: string; ten_sp: string; nhom_hang: string
  ton_he_thong: number; ton_thuc_te: number; chenh_lech: number
  ho_ten: string | null; updated_at: string
}

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [items, setItems] = useState<TonKho[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [fNhom, setFNhom] = useState('')

  // Tìm SP
  const [search, setSearch] = useState('')
  const [goiY, setGoiY] = useState<SanPham[]>([])
  const [showList, setShowList] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  // Giỏ nhập nhiều SP
  const [gio, setGio] = useState<GioItem[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const isAdmin = profile?.vai_tro === 'admin'
  const coTheSua = profile?.vai_tro === 'admin' || profile?.quyen_sua === true

  const taiTonKho = useCallback(async () => {
    const { data } = await supabase.from('ton_kho').select('*').order('updated_at', { ascending: false })
    setItems(data || [])
  }, [supabase])

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    const { data: prof } = await supabase.from('profiles')
      .select('id,ho_ten,vai_tro,phai_doi_mk,quyen_sua').eq('id', session.user.id).single()
    if (prof?.phai_doi_mk) { router.replace('/doi-mat-khau'); return }
    setProfile(prof)
    await taiTonKho()
    setLoading(false)
  }, [router, supabase, taiTonKho])

  useEffect(() => { load() }, [load])

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

  // Thêm SP vào giỏ
  function themVaoGio(sp: SanPham) {
    setSearch(''); setShowList(false); setMsg('')
    if (gio.some(g => g.ten_sp === sp.ten_sp)) {
      setMsg(`"${sp.ten_sp}" đã có trong danh sách nhập.`); return
    }
    if (items.some(i => i.ten_sp === sp.ten_sp)) {
      const daCo = items.find(i => i.ten_sp === sp.ten_sp)!
      setMsg(`⚠️ "${sp.ten_sp}" đã được ${daCo.ho_ten || 'người khác'} cập nhật. Không thể thêm lại.`); return
    }
    setGio(g => [...g, { ten_sp: sp.ten_sp, nhom_hang: sp.nhom_hang, ton_he_thong: '', ton_thuc_te: '', ghi_chu: '' }])
  }

  function suaGio(idx: number, field: keyof GioItem, val: string) {
    setGio(g => g.map((x, i) => i === idx ? { ...x, [field]: val } : x))
  }
  function xoaKhoiGio(idx: number) {
    setGio(g => g.filter((_, i) => i !== idx))
  }

  // Lưu tất cả SP trong giỏ
  async function luuTatCa() {
    if (gio.length === 0) return
    setSaving(true); setMsg('')
    const rows = gio.map(g => ({
      ten_sp: g.ten_sp, nhom_hang: g.nhom_hang,
      ton_he_thong: parseInt(g.ton_he_thong) || 0,
      ton_thuc_te: parseInt(g.ton_thuc_te) || 0,
      ghi_chu: g.ghi_chu.trim() || null,
      updated_by: profile?.id, ho_ten: profile?.ho_ten,
    }))
    const { error } = await supabase.from('ton_kho').insert(rows)
    setSaving(false)
    if (error) {
      if (error.message.includes('duplicate')) {
        setMsg('⚠️ Có sản phẩm vừa được người khác cập nhật. Vui lòng kiểm tra lại danh sách.')
        taiTonKho()
      } else setMsg('Lỗi: ' + error.message)
      return
    }
    setGio([]); setMsg(`✓ Đã lưu ${rows.length} sản phẩm.`); taiTonKho()
  }

  async function suaTon(item: TonKho, field: 'ton_he_thong' | 'ton_thuc_te', val: number) {
    if (!coTheSua) return
    await supabase.from('ton_kho').update({
      [field]: val, updated_by: profile?.id, ho_ten: profile?.ho_ten,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id)
    taiTonKho()
  }
  async function xoa(item: TonKho) {
    if (!coTheSua) return
    if (!confirm(`Xóa "${item.ten_sp}"?`)) return
    const { error } = await supabase.from('ton_kho').delete().eq('id', item.id)
    if (error) alert('Không xóa được: ' + error.message)
    taiTonKho()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!showList || goiY.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i+1, goiY.length-1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i-1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); themVaoGio(goiY[activeIdx]) }
  }

  if (loading) return <div className="center"><p className="muted">Đang tải…</p></div>

  const filtered = items.filter(i =>
    i.ten_sp.toLowerCase().includes(q.toLowerCase()) && (!fNhom || i.nhom_hang === fNhom))
  const soThieu = items.filter(i => i.chenh_lech > 0).length
  const soDu = items.filter(i => i.chenh_lech < 0).length

  function ChenhLech({ v }: { v: number }) {
    if (v === 0) return <span className="muted">0</span>
    if (v > 0) return <span style={{ color: '#dc2626', fontWeight: 700 }}>−{v}</span>
    return <span style={{ color: '#16a34a', fontWeight: 700 }}>+{Math.abs(v)}</span>
  }

  return (
    <Shell hoTen={profile?.ho_ten || ''} isAdmin={isAdmin}>
      <div className="card">
        <h1>Cập nhật tồn kho</h1>
        <p className="muted">Tìm và thêm nhiều sản phẩm vào danh sách, nhập tồn hệ thống & thực tế, rồi lưu tất cả một lần.</p>
      </div>

      {/* Ô tìm + thêm vào giỏ */}
      <div className="card">
        <div className="ac-wrap" ref={boxRef}>
          <label>Tìm & thêm sản phẩm vào danh sách</label>
          <input value={search}
            onChange={e => { setSearch(e.target.value); setShowList(true); setMsg('') }}
            onFocus={() => setShowList(true)} onKeyDown={onKeyDown}
            placeholder="Gõ tên SP rồi chọn để thêm vào danh sách nhập…" autoComplete="off" />
          {showList && search.trim().length >= 1 && (
            <div className="ac-list">
              {goiY.length === 0 ? <div className="ac-empty">Không tìm thấy sản phẩm</div>
              : goiY.map((sp, idx) => {
                const daCo = items.some(i => i.ten_sp === sp.ten_sp) || gio.some(g => g.ten_sp === sp.ten_sp)
                return (
                  <div key={sp.id} className={`ac-item ${idx === activeIdx ? 'active' : ''}`}
                    onMouseEnter={() => setActiveIdx(idx)} onClick={() => themVaoGio(sp)}>
                    <span className="ten">{sp.ten_sp}
                      {daCo && <span style={{ color: 'var(--warn)', fontSize: 12, marginLeft: 6 }}>• đã có</span>}
                    </span>
                    <span className={`tag ${sp.nhom_hang}`}>{NHOM_HANG[sp.nhom_hang]}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {msg && <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, fontSize: 14,
          background: msg.startsWith('✓') ? '#dcfce7' : '#fef3c7',
          color: msg.startsWith('✓') ? '#15803d' : '#92400e' }}>{msg}</div>}
      </div>

      {/* Giỏ nhập — danh sách nhiều SP */}
      {gio.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--brand)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Danh sách nhập ({gio.length} SP)</h2>
            <button onClick={luuTatCa} disabled={saving}>
              {saving ? 'Đang lưu…' : `✓ Lưu tất cả (${gio.length})`}
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr>
                <th>Sản phẩm</th><th>Nhóm</th><th>Tồn HT</th><th>Tồn TT</th><th>Chênh lệch</th><th>Ghi chú</th><th></th>
              </tr></thead>
              <tbody>
                {gio.map((g, idx) => {
                  const cl = (parseInt(g.ton_he_thong) || 0) - (parseInt(g.ton_thuc_te) || 0)
                  return (
                    <tr key={idx}>
                      <td style={{ maxWidth: 220 }}>{g.ten_sp}</td>
                      <td><span className={`tag ${g.nhom_hang}`}>{NHOM_HANG[g.nhom_hang]}</span></td>
                      <td><input type="number" value={g.ton_he_thong} style={{ width: 64 }}
                        onChange={e => suaGio(idx, 'ton_he_thong', e.target.value)} placeholder="0" /></td>
                      <td><input type="number" value={g.ton_thuc_te} style={{ width: 64 }}
                        onChange={e => suaGio(idx, 'ton_thuc_te', e.target.value)} placeholder="0" /></td>
                      <td>{cl === 0 ? <span className="muted">0</span> :
                        cl > 0 ? <span style={{ color: '#dc2626', fontWeight: 700 }}>−{cl}</span>
                        : <span style={{ color: '#16a34a', fontWeight: 700 }}>+{Math.abs(cl)}</span>}</td>
                      <td><input value={g.ghi_chu} style={{ width: 120 }}
                        onChange={e => suaGio(idx, 'ghi_chu', e.target.value)} placeholder="(tùy chọn)" /></td>
                      <td><button className="sm danger" onClick={() => xoaKhoiGio(idx)}>Bỏ</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Danh sách đã cập nhật */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ margin: 0 }}>Đã cập nhật ({items.length})
            <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 10 }}>
              <span style={{ color: '#dc2626' }}>● {soThieu} thiếu</span>{'  '}
              <span style={{ color: '#16a34a' }}>● {soDu} dư</span>
            </span>
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={fNhom} onChange={e => setFNhom(e.target.value)} style={{ width: 140 }}>
              <option value="">— Tất cả —</option>
              {Object.entries(NHOM_HANG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input style={{ width: 180 }} value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 Lọc" />
          </div>
        </div>
        {filtered.length === 0 ? <p className="muted">Chưa có sản phẩm nào.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr>
                <th>Tên sản phẩm</th><th>Nhóm</th><th>Tồn HT</th><th>Tồn TT</th><th>Chênh lệch</th><th>Người CN</th><th>Thời gian</th>
                {coTheSua && <th></th>}
              </tr></thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id}>
                    <td>{item.ten_sp}</td>
                    <td><span className={`tag ${item.nhom_hang}`}>{NHOM_HANG[item.nhom_hang]}</span></td>
                    <td>{coTheSua ? <input type="number" defaultValue={item.ton_he_thong} style={{ width: 60 }}
                      onBlur={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v !== item.ton_he_thong) suaTon(item, 'ton_he_thong', v) }} /> : item.ton_he_thong}</td>
                    <td>{coTheSua ? <input type="number" defaultValue={item.ton_thuc_te} style={{ width: 60 }}
                      onBlur={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v !== item.ton_thuc_te) suaTon(item, 'ton_thuc_te', v) }} /> : item.ton_thuc_te}</td>
                    <td><ChenhLech v={item.chenh_lech} /></td>
                    <td>{item.ho_ten || '—'}</td>
                    <td className="muted">{new Date(item.updated_at).toLocaleString('vi-VN')}</td>
                    {coTheSua && <td><button className="sm danger" onClick={() => xoa(item)}>Xóa</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  )
}
