'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, NHOM_HANG } from '@/lib/supabase'
import TopBar from '@/components/TopBar'

export const dynamic = 'force-dynamic'

type Profile = { id: string; ho_ten: string; vai_tro: string; quyen_sua?: boolean }
type SanPham = { id: string; ten_sp: string; nhom_hang: string }
type TonKho = {
  id: string; ten_sp: string; nhom_hang: string
  ton_he_thong: number; ton_thuc_te: number; chenh_lech: number
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

  const [search, setSearch] = useState('')
  const [goiY, setGoiY] = useState<SanPham[]>([])
  const [chon, setChon] = useState<SanPham | null>(null)
  const [tonHT, setTonHT] = useState('')
  const [tonTT, setTonTT] = useState('')
  const [ghiChu, setGhiChu] = useState('')
  const [showList, setShowList] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [warning, setWarning] = useState('')
  const [saving, setSaving] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

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

  function chonSP(sp: SanPham) {
    setChon(sp); setSearch(sp.ten_sp); setShowList(false); setWarning('')
    const daCo = items.find(i => i.ten_sp === sp.ten_sp)
    if (daCo) {
      setWarning(`⚠️ "${sp.ten_sp}" đã được ${daCo.ho_ten || 'người khác'} cập nhật lúc ${new Date(daCo.updated_at).toLocaleString('vi-VN')}. Không thể cập nhật lại.`)
    }
  }

  async function luu() {
    if (!chon) return
    setWarning(''); setSaving(true)
    const { data: existing } = await supabase.from('ton_kho')
      .select('*').eq('ten_sp', chon.ten_sp).maybeSingle()
    if (existing) {
      setSaving(false)
      setWarning(`⚠️ "${chon.ten_sp}" đã được ${existing.ho_ten || 'người khác'} cập nhật lúc ${new Date(existing.updated_at).toLocaleString('vi-VN')}. Không thể cập nhật lại.`)
      taiTonKho(); return
    }
    const { error } = await supabase.from('ton_kho').insert({
      ten_sp: chon.ten_sp, nhom_hang: chon.nhom_hang,
      ton_he_thong: parseInt(tonHT) || 0, ton_thuc_te: parseInt(tonTT) || 0,
      ghi_chu: ghiChu.trim() || null, updated_by: profile?.id, ho_ten: profile?.ho_ten,
    })
    setSaving(false)
    if (error) {
      if (error.message.includes('duplicate')) {
        setWarning(`⚠️ "${chon.ten_sp}" vừa được người khác cập nhật.`); taiTonKho()
      } else setWarning('Lỗi: ' + error.message)
      return
    }
    setChon(null); setSearch(''); setTonHT(''); setTonTT(''); setGhiChu(''); setGoiY([]); taiTonKho()
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
    if (!confirm(`Xóa "${item.ten_sp}"? (để nhân viên cập nhật lại)`)) return
    const { error } = await supabase.from('ton_kho').delete().eq('id', item.id)
    if (error) alert('Không xóa được: ' + error.message)
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

  // Thống kê nhanh
  const soThieu = items.filter(i => i.chenh_lech > 0).length  // hệ thống > thực tế = thiếu
  const soDu = items.filter(i => i.chenh_lech < 0).length

  function ChenhLech({ v }: { v: number }) {
    if (v === 0) return <span className="muted">0</span>
    // chenh_lech = ton_he_thong - ton_thuc_te. Dương = thiếu; Âm = dư
    if (v > 0) return <span style={{ color: '#dc2626', fontWeight: 700 }}>−{v} (thiếu)</span>
    return <span style={{ color: '#16a34a', fontWeight: 700 }}>+{Math.abs(v)} (dư)</span>
  }

  return (
    <>
      <TopBar hoTen={profile?.ho_ten || ''} isAdmin={isAdmin} />
      <div className="wrap">
        <div className="card">
          <h1>Cập nhật tồn kho</h1>
          <p className="muted">Chọn sản phẩm → nhập tồn hệ thống & tồn thực tế → lưu. Hệ thống tự tính chênh lệch. Mỗi SP chỉ cập nhật <b>một lần</b>.</p>
        </div>

        <div className="card">
          <h2>Chọn sản phẩm cần cập nhật</h2>
          <div className="ac-wrap" ref={boxRef} style={{ marginBottom: 12 }}>
            <label>Tìm sản phẩm (gõ vài ký tự)</label>
            <input value={search}
              onChange={e => { setSearch(e.target.value); setChon(null); setShowList(true); setWarning('') }}
              onFocus={() => setShowList(true)} onKeyDown={onKeyDown}
              placeholder="VD: herschel, samsonite…" autoComplete="off" />
            {showList && search.trim().length >= 1 && (
              <div className="ac-list">
                {goiY.length === 0 ? <div className="ac-empty">Không tìm thấy sản phẩm</div>
                : goiY.map((sp, idx) => {
                  const daCo = items.some(i => i.ten_sp === sp.ten_sp)
                  return (
                    <div key={sp.id} className={`ac-item ${idx === activeIdx ? 'active' : ''}`}
                      onMouseEnter={() => setActiveIdx(idx)} onClick={() => chonSP(sp)}>
                      <span className="ten">{sp.ten_sp}
                        {daCo && <span style={{ color: 'var(--warn)', fontSize: 12, marginLeft: 6 }}>• đã cập nhật</span>}
                      </span>
                      <span className={`tag ${sp.nhom_hang}`}>{NHOM_HANG[sp.nhom_hang]}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div className="row">
            <div style={{ flex: '0 0 130px' }}>
              <label>Tồn hệ thống</label>
              <input type="number" value={tonHT} onChange={e => setTonHT(e.target.value)} placeholder="0" disabled={!!warning} />
            </div>
            <div style={{ flex: '0 0 130px' }}>
              <label>Tồn thực tế</label>
              <input type="number" value={tonTT} onChange={e => setTonTT(e.target.value)} placeholder="0" disabled={!!warning} />
            </div>
            <div style={{ flex: '0 0 150px' }}>
              <label>Chênh lệch</label>
              <div style={{ padding: '10px 12px', border: '1px dashed var(--line)', borderRadius: 8, background: '#fafbfc' }}>
                {(() => {
                  const cl = (parseInt(tonHT) || 0) - (parseInt(tonTT) || 0)
                  if (cl === 0) return <span className="muted">0</span>
                  if (cl > 0) return <span style={{ color: '#dc2626', fontWeight: 700 }}>−{cl} thiếu</span>
                  return <span style={{ color: '#16a34a', fontWeight: 700 }}>+{Math.abs(cl)} dư</span>
                })()}
              </div>
            </div>
            <div>
              <label>Ghi chú</label>
              <input value={ghiChu} onChange={e => setGhiChu(e.target.value)} placeholder="(tùy chọn)" disabled={!!warning} />
            </div>
            <div style={{ flex: '0 0 auto' }}>
              <label>&nbsp;</label>
              <button onClick={luu} disabled={!chon || !!warning || saving}>{saving ? 'Đang lưu…' : '✓ Lưu'}</button>
            </div>
          </div>
          {warning && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, color: '#92400e', fontSize: 14 }}>
              {warning}
            </div>
          )}
          {chon && !warning && <p className="muted" style={{ marginTop: 8 }}>Đã chọn: <b>{chon.ten_sp}</b></p>}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ margin: 0 }}>
              Đã cập nhật ({items.length} SP)
              <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 10 }}>
                <span style={{ color: '#dc2626' }}>● {soThieu} thiếu</span>{'  '}
                <span style={{ color: '#16a34a' }}>● {soDu} dư</span>
              </span>
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={fNhom} onChange={e => setFNhom(e.target.value)} style={{ width: 150 }}>
                <option value="">— Tất cả nhóm —</option>
                {Object.entries(NHOM_HANG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input style={{ width: 200 }} value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 Lọc theo tên" />
            </div>
          </div>
          {filtered.length === 0 ? <p className="muted">Chưa có sản phẩm nào được cập nhật.</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Tên sản phẩm</th><th>Nhóm</th>
                    <th>Tồn HT</th><th>Tồn TT</th><th>Chênh lệch</th>
                    <th>Người cập nhật</th><th>Thời gian</th>
                    {coTheSua && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id}>
                      <td>{item.ten_sp}</td>
                      <td><span className={`tag ${item.nhom_hang}`}>{NHOM_HANG[item.nhom_hang]}</span></td>
                      <td>{coTheSua ? (
                        <input type="number" defaultValue={item.ton_he_thong} style={{ width: 64 }}
                          onBlur={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v !== item.ton_he_thong) suaTon(item, 'ton_he_thong', v) }} />
                      ) : item.ton_he_thong}</td>
                      <td>{coTheSua ? (
                        <input type="number" defaultValue={item.ton_thuc_te} style={{ width: 64 }}
                          onBlur={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v !== item.ton_thuc_te) suaTon(item, 'ton_thuc_te', v) }} />
                      ) : item.ton_thuc_te}</td>
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
      </div>
    </>
  )
}
