'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, NHOM_HANG } from '@/lib/supabase'
import Shell from '@/components/Shell'

export const dynamic = 'force-dynamic'

type Profile = { id: string; ho_ten: string; vai_tro: string }
type SanPham = { id: string; ten_sp: string; nhom_hang: string }
type TonKho = {
  ten_sp: string; nhom_hang: string
  ton_he_thong: number; ton_thuc_te: number; chenh_lech: number
  ho_ten: string | null; updated_at: string; ghi_chu: string | null
}

export default function TraCuu() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [ketQua, setKetQua] = useState<SanPham[]>([])
  const [chon, setChon] = useState<SanPham | null>(null)
  const [tonKho, setTonKho] = useState<TonKho | null>(null)
  const [dangTra, setDangTra] = useState(false)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    const { data: prof } = await supabase.from('profiles')
      .select('id,ho_ten,vai_tro,phai_doi_mk').eq('id', session.user.id).single()
    if (prof?.phai_doi_mk) { router.replace('/doi-mat-khau'); return }
    setProfile(prof)
    setLoading(false)
  }, [router, supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (search.trim().length < 1) { setKetQua([]); return }
    let cancel = false
    const t = setTimeout(async () => {
      const { data } = await supabase.from('san_pham')
        .select('id,ten_sp,nhom_hang').ilike('ten_sp', `%${search.trim()}%`)
        .eq('active', true).limit(30)
      if (!cancel) setKetQua(data || [])
    }, 200)
    return () => { cancel = true; clearTimeout(t) }
  }, [search, supabase])

  async function traCuu(sp: SanPham) {
    setChon(sp); setDangTra(true); setTonKho(null)
    const { data } = await supabase.from('ton_kho')
      .select('*').eq('ten_sp', sp.ten_sp).maybeSingle()
    setTonKho(data); setDangTra(false)
  }

  const isAdmin = profile?.vai_tro === 'admin'
  if (loading) return <div className="center"><p className="muted">Đang tải…</p></div>

  return (
    <Shell hoTen={profile?.ho_ten || ''} isAdmin={isAdmin}>
      <div className="card">
        <h1>Tra cứu sản phẩm</h1>
        <p className="muted">Tìm sản phẩm để xem thông tin nhóm hàng và tình trạng tồn kho (nếu đã kiểm kê).</p>
      </div>

      <div className="card">
        <label>Tìm sản phẩm</label>
        <input value={search} onChange={e => { setSearch(e.target.value); setChon(null); setTonKho(null) }}
          placeholder="Gõ tên sản phẩm cần tra cứu…" autoComplete="off" />

        {search.trim().length >= 1 && !chon && (
          <div style={{ marginTop: 12 }}>
            {ketQua.length === 0 ? <p className="muted">Không tìm thấy sản phẩm.</p> : (
              <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                {ketQua.map(sp => (
                  <div key={sp.id} className="ac-item" onClick={() => traCuu(sp)} style={{ cursor: 'pointer' }}>
                    <span className="ten">{sp.ten_sp}</span>
                    <span className={`tag ${sp.nhom_hang}`}>{NHOM_HANG[sp.nhom_hang]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Kết quả tra cứu */}
      {chon && (
        <div className="card">
          <h2>{chon.ten_sp}</h2>
          <div style={{ marginBottom: 16 }}>
            <span className={`tag ${chon.nhom_hang}`}>{NHOM_HANG[chon.nhom_hang]}</span>
          </div>

          {dangTra ? <p className="muted">Đang tra cứu…</p> : tonKho ? (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))' }}>
              <div className="card" style={{ margin: 0, textAlign: 'center' }}>
                <div className="muted">Tồn hệ thống</div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{tonKho.ton_he_thong}</div>
              </div>
              <div className="card" style={{ margin: 0, textAlign: 'center' }}>
                <div className="muted">Tồn thực tế</div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{tonKho.ton_thuc_te}</div>
              </div>
              <div className="card" style={{ margin: 0, textAlign: 'center',
                borderTop: `3px solid ${tonKho.chenh_lech > 0 ? '#dc2626' : tonKho.chenh_lech < 0 ? '#16a34a' : 'var(--line)'}` }}>
                <div className="muted">Chênh lệch</div>
                <div style={{ fontSize: 26, fontWeight: 800,
                  color: tonKho.chenh_lech > 0 ? '#dc2626' : tonKho.chenh_lech < 0 ? '#16a34a' : 'var(--ink)' }}>
                  {tonKho.chenh_lech === 0 ? '0' : tonKho.chenh_lech > 0 ? `−${tonKho.chenh_lech}` : `+${Math.abs(tonKho.chenh_lech)}`}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {tonKho.chenh_lech > 0 ? 'thiếu' : tonKho.chenh_lech < 0 ? 'dư' : 'khớp'}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: 8, textAlign: 'center' }}>
              <p className="muted">Sản phẩm này <b>chưa được kiểm kê</b>.</p>
            </div>
          )}

          {tonKho && (
            <p className="muted" style={{ marginTop: 12 }}>
              Cập nhật bởi {tonKho.ho_ten || '—'} lúc {new Date(tonKho.updated_at).toLocaleString('vi-VN')}
              {tonKho.ghi_chu && <> · Ghi chú: {tonKho.ghi_chu}</>}
            </p>
          )}
        </div>
      )}
    </Shell>
  )
}
