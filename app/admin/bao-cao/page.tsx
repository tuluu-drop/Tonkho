'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, NHOM_HANG } from '@/lib/supabase'
import TopBar from '@/components/TopBar'

export const dynamic = 'force-dynamic'

type TonKho = {
  ten_sp: string; nhom_hang: string
  ton_he_thong: number; ton_thuc_te: number; chenh_lech: number
}

export default function BaoCao() {
  const router = useRouter()
  const supabase = createClient()
  const [me, setMe] = useState<{ ho_ten: string } | null>(null)
  const [items, setItems] = useState<TonKho[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    const { data: prof } = await supabase.from('profiles')
      .select('ho_ten,vai_tro').eq('id', session.user.id).single()
    if (prof?.vai_tro !== 'admin') { router.replace('/dashboard'); return }
    setMe(prof)
    const { data } = await supabase.from('ton_kho')
      .select('ten_sp,nhom_hang,ton_he_thong,ton_thuc_te,chenh_lech')
    setItems(data || [])
    setLoading(false)
  }, [router, supabase])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="center"><p className="muted">Đang tải…</p></div>

  // Thống kê theo nhóm: đếm SP thiếu, dư, tổng chênh lệch thiếu, tổng dư
  const theoNhom = Object.keys(NHOM_HANG).map(nhom => {
    const list = items.filter(i => i.nhom_hang === nhom)
    const thieu = list.filter(i => i.chenh_lech > 0)
    const du = list.filter(i => i.chenh_lech < 0)
    return {
      nhom,
      tong: list.length,
      soThieu: thieu.length,
      soDu: du.length,
      slThieu: thieu.reduce((a, b) => a + b.chenh_lech, 0),
      slDu: du.reduce((a, b) => a + Math.abs(b.chenh_lech), 0),
    }
  }).filter(x => x.tong > 0)

  // Top dư (chênh lệch âm = dư), sắp xếp nhiều dư nhất trước
  const topDu = items.filter(i => i.chenh_lech < 0)
    .sort((a, b) => a.chenh_lech - b.chenh_lech)
  // Top thiếu (chênh lệch dương = thiếu), nhiều thiếu nhất trước
  const topThieu = items.filter(i => i.chenh_lech > 0)
    .sort((a, b) => b.chenh_lech - a.chenh_lech)

  const tongThieu = items.filter(i => i.chenh_lech > 0).reduce((a, b) => a + b.chenh_lech, 0)
  const tongDu = items.filter(i => i.chenh_lech < 0).reduce((a, b) => a + Math.abs(b.chenh_lech), 0)

  return (
    <>
      <TopBar hoTen={me?.ho_ten || ''} isAdmin />
      <div className="wrap">
        <div className="card">
          <a href="/admin" className="muted" style={{ textDecoration: 'none' }}>← Về Quản trị</a>
          <h1 style={{ marginTop: 8 }}>Báo cáo chênh lệch tồn kho</h1>
          <p className="muted">Tổng hợp {items.length} sản phẩm đã kiểm kê.</p>
        </div>

        {/* Thẻ tổng quan */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
          <div className="card" style={{ margin: 0, textAlign: 'center', borderTop: '3px solid #dc2626' }}>
            <div className="muted">Tổng SL thiếu</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#dc2626' }}>{tongThieu}</div>
            <div className="muted" style={{ fontSize: 12 }}>{items.filter(i => i.chenh_lech > 0).length} sản phẩm</div>
          </div>
          <div className="card" style={{ margin: 0, textAlign: 'center', borderTop: '3px solid #16a34a' }}>
            <div className="muted">Tổng SL dư</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#16a34a' }}>{tongDu}</div>
            <div className="muted" style={{ fontSize: 12 }}>{items.filter(i => i.chenh_lech < 0).length} sản phẩm</div>
          </div>
          <div className="card" style={{ margin: 0, textAlign: 'center', borderTop: '3px solid var(--brand)' }}>
            <div className="muted">Tổng SP kiểm kê</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--brand)' }}>{items.length}</div>
            <div className="muted" style={{ fontSize: 12 }}>{items.filter(i => i.chenh_lech === 0).length} khớp đúng</div>
          </div>
        </div>

        {/* Thống kê theo nhóm hàng */}
        <div className="card">
          <h2>Chênh lệch theo phân loại</h2>
          <table>
            <thead>
              <tr><th>Nhóm hàng</th><th>Đã KK</th><th>SP thiếu</th><th>SL thiếu</th><th>SP dư</th><th>SL dư</th></tr>
            </thead>
            <tbody>
              {theoNhom.map(x => (
                <tr key={x.nhom}>
                  <td><span className={`tag ${x.nhom}`}>{NHOM_HANG[x.nhom]}</span></td>
                  <td>{x.tong}</td>
                  <td style={{ color: x.soThieu ? '#dc2626' : undefined }}>{x.soThieu}</td>
                  <td style={{ color: x.slThieu ? '#dc2626' : undefined, fontWeight: x.slThieu ? 700 : 400 }}>{x.slThieu ? `−${x.slThieu}` : 0}</td>
                  <td style={{ color: x.soDu ? '#16a34a' : undefined }}>{x.soDu}</td>
                  <td style={{ color: x.slDu ? '#16a34a' : undefined, fontWeight: x.slDu ? 700 : 400 }}>{x.slDu ? `+${x.slDu}` : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
          {/* Top thiếu */}
          <div className="card" style={{ margin: 0 }}>
            <h2 style={{ color: '#dc2626' }}>SP thiếu nhiều nhất</h2>
            {topThieu.length === 0 ? <p className="muted">Không có SP thiếu.</p> : (
              <table>
                <thead><tr><th>Sản phẩm</th><th>Nhóm</th><th>Thiếu</th></tr></thead>
                <tbody>
                  {topThieu.slice(0, 20).map((i, idx) => (
                    <tr key={idx}>
                      <td>{i.ten_sp}</td>
                      <td><span className={`tag ${i.nhom_hang}`}>{NHOM_HANG[i.nhom_hang]}</span></td>
                      <td style={{ color: '#dc2626', fontWeight: 700 }}>−{i.chenh_lech}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Top dư */}
          <div className="card" style={{ margin: 0 }}>
            <h2 style={{ color: '#16a34a' }}>SP dư nhiều nhất</h2>
            {topDu.length === 0 ? <p className="muted">Không có SP dư.</p> : (
              <table>
                <thead><tr><th>Sản phẩm</th><th>Nhóm</th><th>Dư</th></tr></thead>
                <tbody>
                  {topDu.slice(0, 20).map((i, idx) => (
                    <tr key={idx}>
                      <td>{i.ten_sp}</td>
                      <td><span className={`tag ${i.nhom_hang}`}>{NHOM_HANG[i.nhom_hang]}</span></td>
                      <td style={{ color: '#16a34a', fontWeight: 700 }}>+{Math.abs(i.chenh_lech)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
